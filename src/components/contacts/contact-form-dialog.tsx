'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mic, Square, FolderPlus, ChevronsUpDown, Check, Plus, Edit, MoreVertical, Trash2, X, WalletCards, ShieldCheck, Landmark, Users, Save, Files } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { type Contact } from '@/services/contact-service';
import { type FolderData } from '@/services/contact-folder-service';
import { type Company } from '@/services/accounting-service';
import { type Industry } from '@/services/industry-service';
import { addCompany } from '@/services/accounting-service';
import { addIndustry, updateIndustry } from '@/services/industry-service';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addContact, updateContact } from '@/services/contact-service';
import { addFolder } from '@/services/contact-folder-service';
import { useAuth } from '@/context/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';

const contactSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  birthDate: z.string().optional(),
  website: z.string().optional(),
  businessName: z.string().optional(),
  employeeNumber: z.string().optional(),
  industryCode: z.string().optional(),
  craProgramAccountNumber: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  provinceState: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  businessPhone: z.string().optional(),
  cellPhone: z.string().optional(),
  homePhone: z.string().optional(),
  faxNumber: z.string().optional(),
  primaryPhoneType: z.enum(['businessPhone', 'cellPhone', 'homePhone']).nullable().default(null),
  notes: z.string().optional(),
  folderId: z.string({ required_error: "Please select a folder." }).min(1, { message: "Folder is required." }),
  
  sin: z.string().optional(),
  workerType: z.enum(["employee", "contractor"]).optional().nullable(),
  payType: z.enum(["hourly", "salary"]).optional().nullable(),
  payRate: z.coerce.number().min(0).optional().nullable(),
  hireDate: z.string().optional(),
  startDate: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  hasContract: z.boolean().default(false),
  specialNeeds: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    contactToEdit: Contact | null;
    folders: FolderData[];
    onFoldersChange: (folders: FolderData[]) => void;
    onSave: (contact: Contact, isEditing: boolean) => void;
    companies: Company[];
    onCompaniesChange: (companies: Company[]) => void;
    customIndustries: Industry[];
    onCustomIndustriesChange: (industries: Industry[]) => void;
    selectedFolderId?: string;
    initialEmail?: string;
    initialData?: Partial<Contact>;
    forceFolderId?: string;
}

const defaultFormValues: ContactFormData = {
  name: "", email: "", birthDate: "", website: "", businessName: "", employeeNumber: "", industryCode: "", craProgramAccountNumber: "",
  streetAddress: "", city: "", provinceState: "", postalCode: "", country: "", businessPhone: "", cellPhone: "", homePhone: "", faxNumber: "", primaryPhoneType: null,
  notes: "", folderId: "", sin: "", workerType: null, payType: null, payRate: 0, hireDate: "", startDate: "", 
  emergencyContactName: "", emergencyContactPhone: "", hasContract: false, specialNeeds: "",
};

export default function ContactFormDialog({
    isOpen, onOpenChange, contactToEdit, folders, onFoldersChange, onSave, companies, onCompaniesChange, customIndustries, onCustomIndustriesChange, selectedFolderId, initialEmail = '', initialData, forceFolderId,
}: ContactFormDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();
    
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    
    const form = useForm<ContactFormData>({ resolver: zodResolver(contactSchema), defaultValues: defaultFormValues });
    const watchFolderId = form.watch('folderId');

    const showHrSection = useMemo(() => {
        const selectedFolder = folders.find(f => f.id === watchFolderId);
        if (!selectedFolder) return false;
        const name = selectedFolder.name.toLowerCase();
        return name === 'workers' || name === 'employees' || name === 'contractors';
    }, [watchFolderId, folders]);

    useEffect(() => {
        if (!isOpen) return;

        const defaultId = forceFolderId || (selectedFolderId && selectedFolderId !== 'all') ? selectedFolderId : (folders.find(f => f.name === 'Clients')?.id || folders[0]?.id || '');
        
        if (contactToEdit) {
            form.reset({
                ...defaultFormValues,
                ...contactToEdit,
                folderId: forceFolderId || contactToEdit.folderId || defaultId,
                hireDate: contactToEdit.hireDate?.toDate ? contactToEdit.hireDate.toDate().toISOString().split('T')[0] : contactToEdit.hireDate,
                startDate: contactToEdit.startDate?.toDate ? contactToEdit.startDate.toDate().toISOString().split('T')[0] : contactToEdit.startDate,
            });
        } else {
            form.reset({ ...defaultFormValues, email: initialEmail, folderId: defaultId, ...initialData });
        }
    }, [isOpen, contactToEdit, forceFolderId, selectedFolderId, form, initialEmail, initialData]);

    async function onSubmit(values: ContactFormData) {
        if (!user) return;
        try {
            // HIGH-FIDELITY PAYLOAD SCRUBBING
            // If the contact is not a worker, strip all HR/Payroll metadata to prevent list pollution.
            const scrubbedValues: any = { ...values };
            if (!showHrSection) {
                const hrFields = ['sin', 'workerType', 'payType', 'payRate', 'hireDate', 'startDate', 'emergencyContactName', 'emergencyContactPhone', 'hasContract', 'specialNeeds'];
                hrFields.forEach(f => delete scrubbedValues[f]);
                scrubbedValues.workerType = null;
            }

            if (contactToEdit) {
                await updateContact(contactToEdit.id, scrubbedValues);
                onSave({ ...contactToEdit, ...scrubbedValues }, true);
                toast({ title: "Contact Updated" });
            } else {
                const created = await addContact({ ...scrubbedValues, userId: user.uid } as any);
                onSave(created, false);
                toast({ title: "Contact Created" });
            }
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        }
    }

    const handleCreateFolder = async () => {
        if (!user || !newFolderName.trim()) return;
        const newFolder = await addFolder({ name: newFolderName.trim(), userId: user.uid, parentId: null });
        onFoldersChange([...folders, newFolder]);
        form.setValue('folderId', newFolder.id);
        setIsNewFolderDialogOpen(false);
    };

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none flex flex-col p-0 text-black">
                <DialogHeader className="p-6 pb-4 border-b bg-muted/10 shrink-0 relative">
                    <DialogTitle className="text-2xl font-bold font-headline text-primary">
                        {contactToEdit ? "Edit Unified Identity" : "New Unified Identity"}
                    </DialogTitle>
                    <DialogDescription>Registry entry for Clients, Workers, Suppliers, and Leads.</DialogDescription>
                    {contactToEdit?.documentFolderId && (
                        <div className="absolute top-6 left-6">
                            <Button variant="outline" size="sm" className="h-8" onClick={() => router.push(`/document-manager?highlight=${contactToEdit.documentFolderId}`)}>
                                <Files className="mr-2 h-4 w-4" /> View Evidence
                            </Button>
                        </div>
                    )}
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <ScrollArea className="flex-1">
                            <div className="max-w-5xl mx-auto w-full p-8 space-y-10">
                                <section className="space-y-6">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2">
                                        <Users className="h-4 w-4" /> 1. Core Profile
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Full Legal Name *</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email Identity</FormLabel><FormControl><Input placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="folderId" render={({ field }) => ( 
                                            <FormItem><FormLabel>Role Assignment (Folder) *</FormLabel><div className="flex gap-2"><FormControl><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Assign role..." /></SelectTrigger><SelectContent>{folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></FormControl><Button type="button" variant="outline" size="icon" onClick={() => setIsNewFolderDialogOpen(true)}><FolderPlus className="h-4 w-4"/></Button></div><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="employeeNumber" render={({ field }) => ( <FormItem><FormLabel>Worker/User ID Number</FormLabel><FormControl><Input placeholder="e.g., W-1001" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2">
                                        <Landmark className="h-4 w-4" /> 2. Business & Tax Configuration
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="businessName" render={({ field }) => ( <FormItem><FormLabel>Legal Company Name</FormLabel><FormControl><Input placeholder="Acme Operations Ltd." {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="craProgramAccountNumber" render={({ field }) => ( <FormItem><FormLabel>Business Number (BN / Tax ID)</FormLabel><FormControl><Input placeholder="123456789RP0001" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                </section>

                                {showHrSection && (
                                    <section className="space-y-6 p-6 border-2 border-primary/20 bg-primary/5 rounded-2xl animate-in fade-in-50 zoom-in-95 duration-300">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-primary border-b border-primary/20 pb-2 flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4" /> 3. Payroll & HR Details (Confidential)
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <FormField control={form.control} name="workerType" render={({ field }) => ( <FormItem><FormLabel>Employment Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="employee">T4 Employee</SelectItem><SelectItem value="contractor">T4A Contractor</SelectItem></SelectContent></Select></FormItem> )} />
                                            <FormField control={form.control} name="payType" render={({ field }) => ( <FormItem><FormLabel>Pay Model</FormLabel><Select onValueChange={field.onChange} value={field.value || ""}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="hourly">Hourly Rate</SelectItem><SelectItem value="salary">Annual Salary</SelectItem></SelectContent></Select></FormItem> )} />
                                            <FormField control={form.control} name="payRate" render={({ field }) => ( <FormItem><FormLabel>Rate ($)</FormLabel><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span><FormControl><Input type="number" className="pl-7" {...field} value={field.value ?? 0} /></FormControl></div></FormItem> )} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField control={form.control} name="sin" render={({ field }) => ( <FormItem><FormLabel>SIN (HR Secure)</FormLabel><FormControl><Input type="password" placeholder="••• ••• •••" {...field} /></FormControl></FormItem> )} />
                                            <FormField control={form.control} name="hireDate" render={({ field }) => ( <FormItem><FormLabel>Date Hired</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem> )} />
                                        </div>
                                        <FormField control={form.control} name="hasContract" render={({ field }) => ( <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-xl bg-white"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label className="font-semibold">Employment / Contractor Agreement on File</Label></FormItem> )} />
                                    </section>
                                )}

                                <section className="space-y-6">
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b pb-2 flex items-center gap-2">
                                        <Phone className="h-4 w-4" /> 4. Contact Intelligence
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormField control={form.control} name="cellPhone" render={({ field }) => ( <FormItem><FormLabel>Cell #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                        <FormField control={form.control} name="businessPhone" render={({ field }) => ( <FormItem><FormLabel>Work #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                        <FormField control={form.control} name="homePhone" render={({ field }) => ( <FormItem><FormLabel>Home #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem> )} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4 p-4 border rounded-xl bg-muted/10">
                                            <Label className="text-xs uppercase font-bold text-muted-foreground">Primary Address</Label>
                                            <FormField control={form.control} name="streetAddress" render={({ field }) => ( <Input placeholder="Street" {...field} /> )} />
                                            <div className="grid grid-cols-2 gap-2">
                                                <FormField control={form.control} name="city" render={({ field }) => ( <Input placeholder="City" {...field} /> )} />
                                                <FormField control={form.control} name="provinceState" render={({ field }) => ( <Input placeholder="Prov/State" {...field} /> )} />
                                            </div>
                                        </div>
                                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Administrative Notes</FormLabel><FormControl><Textarea placeholder="Background info or specific permission rationale..." rows={6} className="resize-none" {...field} /></FormControl></FormItem> )} />
                                    </div>
                                </section>
                            </div>
                        </ScrollArea>
                        <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
                            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" size="lg" className="px-12 font-bold shadow-xl">
                                <Save className="mr-2 h-5 w-5" /> {contactToEdit ? "Save Changes" : "Create Identity"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Create Identity Folder</DialogTitle></DialogHeader><div className="py-4"><Label>Folder Name</Label><Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} /></div><DialogFooter><Button onClick={handleCreateFolder}>Create</Button></DialogFooter></DialogContent></Dialog>
        </>
    );
}