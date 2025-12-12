
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mic, Square, FolderPlus, ChevronsUpDown, Check, Plus, Edit, MoreVertical, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from '@/components/ui/textarea';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useToast } from '@/hooks/use-toast';
import { type Contact } from '@/services/contact-service';
import { type FolderData } from '@/services/contact-folder-service';
import { type Company } from '@/services/accounting-service';
import { type Industry } from '@/services/industry-service';
import { addCompany } from '@/services/accounting-service';
import { addIndustry, updateIndustry, deleteIndustry } from '@/services/industry-service';
import { craIndustryCodes } from '@/data/cra-industry-codes';
import { ScrollArea } from '../ui/scroll-area';
import { addContact, updateContact } from '@/services/contact-service';
import { addFolder } from '@/services/contact-folder-service';
import { useAuth } from '@/context/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

const contactSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  website: z.string().optional(),
  businessName: z.string().optional(),
  industryCode: z.string().optional(),
  craProgramAccountNumber: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  provinceState: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  homeAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    provinceState: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
  businessPhone: z.string().optional(),
  cellPhone: z.string().optional(),
  homePhone: z.string().optional(),
  faxNumber: z.string().optional(),
  primaryPhoneType: z.enum(['businessPhone', 'cellPhone', 'homePhone']).nullable().default(null),
  notes: z.string().optional(),
  folderId: z.string({ required_error: "Please select a folder." }).min(1, { message: "Folder is required." }),
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
  name: "",
  email: "",
  website: "",
  businessName: "",
  industryCode: "",
  craProgramAccountNumber: "",
  streetAddress: "",
  city: "",
  provinceState: "",
  postalCode: "",
  country: "",
  homeAddress: {
    street: "",
    city: "",
    provinceState: "",
    country: "",
    postalCode: "",
  },
  businessPhone: "",
  cellPhone: "",
  homePhone: "",
  faxNumber: "",
  primaryPhoneType: null,
  notes: "",
  folderId: "",
};

export default function ContactFormDialog({
    isOpen,
    onOpenChange,
    contactToEdit,
    folders,
    onFoldersChange,
    onSave,
    companies,
    onCompaniesChange,
    customIndustries,
    onCustomIndustriesChange,
    selectedFolderId,
    initialEmail = '',
    initialData = {},
    forceFolderId,
}: ContactFormDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [notesBeforeSpeech, setNotesBeforeSpeech] = useState('');
    const notesRef = useRef<HTMLTextAreaElement>(null);
    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const { preferences } = useUserPreferences();
    
    const [isCompanyPopoverOpen, setIsCompanyPopoverOpen] = useState(false);
    const [companySearchValue, setCompanySearchValue] = useState("");
    const [isIndustryPopoverOpen, setIsIndustryPopoverOpen] = useState(false);
    const [industrySearchValue, setIndustrySearchValue] = useState('');
    
    // State for the custom industry creation/editing dialog
    const [isAddIndustryDialogOpen, setIsAddIndustryDialogOpen] = useState(false);
    const [industryToEdit, setIndustryToEdit] = useState<Industry | null>(null);
    const [newIndustryName, setNewIndustryName] = useState('');
    const [newIndustryCode, setNewIndustryCode] = useState('');
    
    const [industryToDelete, setIndustryToDelete] = useState<Industry | null>(null);

    const allIndustries = useMemo(() => {
        const standard = craIndustryCodes.map(i => ({...i, id: i.code}));
        return [...standard, ...(customIndustries || [])].sort((a, b) => a.description.localeCompare(b.description));
    }, [customIndustries]);
    
    const form = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
        defaultValues: defaultFormValues,
    });
    
    const businessPhoneValue = form.watch('businessPhone');
    const cellPhoneValue = form.watch('cellPhone');
    const homePhoneValue = form.watch('homePhone');
    
    const contactToEditString = JSON.stringify(contactToEdit);
    const initialDataString = JSON.stringify(initialData);

    useEffect(() => {
        const defaultFolderId = forceFolderId || (selectedFolderId && selectedFolderId !== 'all') ? selectedFolderId : (folders.find(f => f.name === 'Clients')?.id || folders[0]?.id || '');
        if (isOpen) {
            const parsedContact = contactToEditString ? JSON.parse(contactToEditString) : null;
            const parsedInitialData = initialDataString ? JSON.parse(initialDataString) : {};

            if (parsedContact) {
                form.reset({
                    ...defaultFormValues,
                    ...parsedContact,
                    folderId: forceFolderId || parsedContact.folderId || defaultFolderId,
                    primaryPhoneType: parsedContact.primaryPhoneType || null,
                });
            } else {
                form.reset({
                    ...defaultFormValues,
                    email: initialEmail,
                    folderId: defaultFolderId,
                    ...parsedInitialData,
                });
            }
        }
    }, [isOpen, contactToEditString, forceFolderId, selectedFolderId, initialEmail, initialDataString, form, folders]);

    const { isListening, startListening, stopListening, isSupported } = useSpeechToText({
        onTranscript: (transcript) => {
            const newText = notesBeforeSpeech ? `${notesBeforeSpeech} ${transcript}`.trim() : transcript;
            form.setValue('notes', newText, { shouldValidate: true });
        },
    });

    const handleDictateNotes = () => {
        if (isListening) {
            stopListening();
        } else {
            setNotesBeforeSpeech(form.getValues('notes') || '');
            form.setFocus('notes');
            startListening();
        }
    };
    
    async function onSubmit(values: ContactFormData) {
        if (!user) {
            toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to save a contact." });
            return;
        }

        const dataToSave = {
            ...values,
            folderId: forceFolderId || values.folderId,
            primaryPhoneType: values.primaryPhoneType || null,
        };

        try {
            if (contactToEdit) {
                const updatedContactData = { ...contactToEdit, ...dataToSave };
                await updateContact(contactToEdit.id, updatedContactData);
                onSave(updatedContactData, true);
                toast({ title: "Contact Updated", description: `Details for ${values.name} have been saved.` });
            } else {
                const newContactData: Omit<Contact, 'id'> = {
                    ...dataToSave,
                    email: dataToSave.email || '',
                    userId: user.uid,
                };
                const newContact = await addContact(newContactData);
                onSave(newContact, false);
                toast({ title: "Contact Created", description: `${newContact.name} has been added.` });
            }
            onOpenChange(false);
        } catch (error: any) {
            console.error("Failed to save contact:", error);
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: error.message || "Could not save the contact to the database.",
            });
        }
    }

    const handleCreateFolder = async () => {
        if (!user || !newFolderName.trim()) return;
        try {
            const newFolder = await addFolder({ name: newFolderName.trim(), userId: user.uid, parentId: null });
            onFoldersChange([...folders, newFolder]);
            form.setValue('folderId', newFolder.id);
            toast({ title: "Folder Created" });
        } catch(e: any) { toast({ variant: "destructive", title: "Failed", description: (e as Error).message }); }
        finally { setIsNewFolderDialogOpen(false); setNewFolderName(""); }
    };
    
    const handleCreateCompany = async (companyName: string) => {
        if (!user || !companyName.trim()) return;
        try {
            const newCompany = await addCompany({ name: companyName.trim(), userId: user.uid });
            onCompaniesChange([...companies, newCompany]);
            form.setValue('businessName', newCompany.name);
            setIsCompanyPopoverOpen(false);
            setCompanySearchValue('');
            toast({ title: 'Company Created', description: `"${companyName.trim()}" has been added.` });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Failed to create company', description: error.message });
        }
    };
    
    const handleOpenCreateIndustryDialog = (industry: Industry | null) => {
        setIndustryToEdit(industry);
        setNewIndustryName(industry ? industry.description : '');
        setNewIndustryCode(industry ? industry.code : '');
        setIsAddIndustryDialogOpen(true);
    };

    const handleConfirmSaveIndustry = async () => {
        if (!user || !newIndustryName.trim()) return;
        try {
            if (industryToEdit) {
                // Update existing industry
                const updatedData = { description: newIndustryName.trim(), code: newIndustryCode.trim() };
                await updateIndustry(industryToEdit.id, updatedData);
                onCustomIndustriesChange(customIndustries.map(i => i.id === industryToEdit.id ? { ...i, ...updatedData } : i));
                toast({ title: 'Industry Updated' });
            } else {
                // Add new industry
                const newIndustry = await addIndustry({
                    description: newIndustryName.trim(),
                    code: newIndustryCode.trim(),
                    userId: user.uid
                });
                onCustomIndustriesChange([...customIndustries, newIndustry]);
                form.setValue('industryCode', newIndustry.code);
                toast({ title: 'Industry Created', description: `"${newIndustryName.trim()}" has been added.` });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to save industry', description: error.message });
        } finally {
            setIsAddIndustryDialogOpen(false);
        }
    };
    
    const handleConfirmDeleteIndustry = async () => {
        if (!user || !industryToDelete) return;
        try {
            await deleteIndustry(industryToDelete.id);
            onCustomIndustriesChange(customIndustries.filter(i => i.id !== industryToDelete.id));
            if (form.getValues('industryCode') === industryToDelete.code) {
                form.setValue('industryCode', '');
            }
            toast({ title: 'Industry Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to delete industry', description: error.message });
        } finally {
            setIndustryToDelete(null);
        }
    };

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b text-center sm:text-center">
                    <DialogTitle className="text-2xl font-bold font-headline text-primary">
                        {contactToEdit ? "Edit Contact" : "New Contact"}
                    </DialogTitle>
                    <DialogDescription>
                        {contactToEdit ? `Editing details for ${contactToEdit.name}.` : `Create a new contact.`}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <ScrollArea className="flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 px-6 pb-4 bg-card">
                                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Contact Name <span className="text-destructive">*</span></FormLabel><div className="h-10 flex items-center"><FormControl><Input placeholder="John Doe" {...field} /></FormControl></div><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="businessName" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Company Name</FormLabel><div className='flex items-center h-10'><Popover open={isCompanyPopoverOpen} onOpenChange={setIsCompanyPopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-between h-10"><span className="truncate">{field.value || "Select a company..."}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/></Button></FormControl></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}><CommandInput placeholder="Search or create company..." value={companySearchValue} onValueChange={setCompanySearchValue}/><CommandList><CommandEmpty><div className="p-1"><Button variant="outline" className="w-full" onClick={() => { handleCreateCompany(companySearchValue); setIsCompanyPopoverOpen(false); }}><Plus className="mr-2 h-4 w-4"/> Create "{companySearchValue}"</Button></div></CommandEmpty><CommandGroup>{companies?.map(c => ( <CommandItem key={c.id} value={c.name} onSelect={() => { form.setValue('businessName', c.name); setIsCompanyPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", field.value === c.name ? 'opacity-100' : 'opacity-0')} /> {c.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover></div><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="folderId" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>Folder <span className="text-destructive">*</span></FormLabel> <div className="flex gap-2 h-10 items-center"><Select onValueChange={field.onChange} value={field.value} disabled={!!forceFolderId}><FormControl><SelectTrigger><SelectValue placeholder="Select a folder" /></SelectTrigger></FormControl><SelectContent>{folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select> <Button type="button" variant="outline" size="icon" onClick={() => setIsNewFolderDialogOpen(true)} disabled={!!forceFolderId}><FolderPlus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="industryCode" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Industry (NAICS)</FormLabel><div className="flex gap-2 h-10 items-center"><Popover open={isIndustryPopoverOpen} onOpenChange={setIsIndustryPopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-between"><span className="truncate">{field.value ? allIndustries.find(i => i.code === field.value)?.description : 'Select an industry...'}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}><CommandInput placeholder="Search industry..." value={industrySearchValue} onValueChange={setIndustrySearchValue}/><CommandList><CommandEmpty>No industry found.</CommandEmpty><CommandGroup>{allIndustries.map(i => { const isCustom = 'userId' in i; return ( <CommandItem key={i.code} value={`${i.description} ${i.code}`} onSelect={() => { form.setValue('industryCode', i.code); setIsIndustryPopoverOpen(false); }} className="flex justify-between items-center group"> <div className="flex items-center"> <Check className={cn("mr-2 h-4 w-4", field.value === i.code ? 'opacity-100' : 'opacity-0')} /> <span>({i.code}) {i.description}</span></div> {isCustom && ( <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger><DropdownMenuContent onClick={(e) => e.stopPropagation()}><DropdownMenuItem onSelect={() => handleOpenCreateIndustryDialog(i as Industry)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem><DropdownMenuItem onSelect={() => setIndustryToDelete(i as Industry)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>)}</CommandItem>);})}</CommandGroup></CommandList></Command></PopoverContent></Popover><Button type="button" variant="outline" size="icon" onClick={() => handleOpenCreateIndustryDialog(null)}><Plus className="h-4 w-4" /></Button></div><FormMessage /></FormItem>)}/>
                                <FormField control={form.control} name="craProgramAccountNumber" render={({ field }) => ( <FormItem> <FormLabel>CRA Program Account #</FormLabel> <FormControl><Input placeholder="e.g., 123456789RP0001" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <div className="md:col-span-2 space-y-2"> <Label>Business Address</Label><div className="space-y-2 p-4 border rounded-md"><FormField control={form.control} name="streetAddress" render={({ field }) => ( <FormItem> <FormLabel>Street Address</FormLabel> <FormControl><Input placeholder="123 Main St" {...field} /></FormControl> <FormMessage /> </FormItem> )} /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><FormField control={form.control} name="city" render={({ field }) => ( <FormItem> <FormLabel>City/Town</FormLabel> <FormControl><Input placeholder="Anytown" {...field} /></FormControl> <FormMessage /> </FormItem> )} /><FormField control={form.control} name="provinceState" render={({ field }) => ( <FormItem> <FormLabel>Prov/State</FormLabel> <FormControl><Input placeholder="CA" {...field} /></FormControl> <FormMessage /> </FormItem> )} /><FormField control={form.control} name="postalCode" render={({ field }) => ( <FormItem> <FormLabel>Postal/Zip</FormLabel> <FormControl><Input placeholder="12345" {...field} /></FormControl> <FormMessage /> </FormItem> )} /></div><FormField control={form.control} name="country" render={({ field }) => ( <FormItem> <FormLabel>Country</FormLabel> <FormControl><Input placeholder="USA" {...field} /></FormControl> <FormMessage /> </FormItem> )} /></div></div>
                                <div className="md:col-span-2 space-y-2"> <Label>Home Address</Label><div className="space-y-2 p-4 border rounded-md"><FormField control={form.control} name="homeAddress.street" render={({ field }) => ( <FormItem><FormLabel>Street</FormLabel><FormControl><Input placeholder="456 Home Ave" {...field} /></FormControl></FormItem> )} /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4"><FormField control={form.control} name="homeAddress.city" render={({ field }) => ( <FormItem><FormLabel>City/Town</FormLabel><FormControl><Input placeholder="Hometown" {...field} /></FormControl></FormItem> )} /><FormField control={form.control} name="homeAddress.provinceState" render={({ field }) => ( <FormItem><FormLabel>Prov./State</FormLabel><FormControl><Input placeholder="CA" {...field} /></FormControl></FormItem> )} /><FormField control={form.control} name="homeAddress.country" render={({ field }) => ( <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="USA" {...field} /></FormControl></FormItem> )} /><FormField control={form.control} name="homeAddress.postalCode" render={({ field }) => ( <FormItem><FormLabel>Postal/Zip</FormLabel><FormControl><Input placeholder="67890" {...field} /></FormControl></FormItem> )} /></div></div></div>
                                <FormField control={form.control} name="website" render={({ field }) => ( <FormItem> <FormLabel>Website</FormLabel> <FormControl><Input placeholder="https://example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name="businessPhone" render={({ field }) => ( <FormItem><FormLabel>Business #</FormLabel><div className="relative"><FormControl><Input placeholder="123-456-7890" {...field} className={field.value ? "pr-10" : ""} /></FormControl>{field.value && <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" asChild><a href={`tel:${field.value}`}><Phone className="h-4 w-4" /><span className="sr-only">Call Business</span></a></Button>}</div><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="cellPhone" render={({ field }) => ( <FormItem><FormLabel>Cell #</FormLabel><div className="relative"><FormControl><Input placeholder="123-456-7890" {...field} className={field.value ? "pr-10" : ""} /></FormControl>{field.value && <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" asChild><a href={`tel:${field.value}`}><Phone className="h-4 w-4" /><span className="sr-only">Call Cell</span></a></Button>}</div><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="homePhone" render={({ field }) => ( <FormItem><FormLabel>Home #</FormLabel><div className="relative"><FormControl><Input placeholder="123-456-7890" {...field} className={field.value ? "pr-10" : ""} /></FormControl>{field.value && <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" asChild><a href={`tel:${field.value}`}><Phone className="h-4 w-4" /><span className="sr-only">Call Home</span></a></Button>}</div><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="faxNumber" render={({ field }) => ( <FormItem> <FormLabel>Fax #</FormLabel> <FormControl><Input placeholder="123-456-7890" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField control={form.control} name="primaryPhoneType" render={({ field }) => ( <FormItem className="space-y-2 md:col-span-2"><FormLabel>Best number to use</FormLabel><FormDescription>Select the best number to use for this contact.</FormDescription><FormControl><RadioGroup onValueChange={field.onChange} value={field.value || ""} className="grid grid-cols-1 sm:grid-cols-3 gap-2"><FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-2 transition-colors", field.value === 'businessPhone' ? "bg-primary/10 border-primary" : "")}><FormControl><RadioGroupItem value="businessPhone" disabled={!businessPhoneValue} /></FormControl><FormLabel className="font-normal w-full cursor-pointer">Business</FormLabel></FormItem><FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-2 transition-colors", field.value === 'cellPhone' ? "bg-primary/10 border-primary" : "")}><FormControl><RadioGroupItem value="cellPhone" disabled={!cellPhoneValue} /></FormControl><FormLabel className="font-normal w-full cursor-pointer">Cell</FormLabel></FormItem><FormItem className={cn("flex items-center space-x-3 space-y-0 rounded-md border p-2 transition-colors", field.value === 'homePhone' ? "bg-primary/10 border-primary" : "")}><FormControl><RadioGroupItem value="homePhone" disabled={!homePhoneValue} /></FormControl><FormLabel className="font-normal w-full cursor-pointer">Home</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Notes</FormLabel><FormDescription>Add any important notes about this contact, such as credit history or communication preferences.</FormDescription><div className="relative"><FormControl><Textarea placeholder="Reference to information regarding the client.." className="resize-none pr-10" rows={5} {...field} ref={notesRef}/></FormControl>{preferences?.showDictationButton && ( <Button type="button" variant={isListening ? 'destructive' : 'ghost'} size="icon" className="absolute bottom-2 right-2 h-8 w-8" onClick={handleDictateNotes} disabled={isSupported === false} title={isSupported === false ? "Voice not supported" : (isListening ? "Stop dictation" : "Dictate notes")}>{isListening ? <Square className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}<span className="sr-only">{isListening ? "Stop dictation" : "Dictate notes"}</span></Button>)}</div><FormMessage /></FormItem>)}/>
                            </div>
                        </ScrollArea>
                        <DialogFooter className="p-6 border-t">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit">{contactToEdit ? "Save Changes" : "Create Contact"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
            <div className="py-4">
              <Label htmlFor="folder-name-new">Name</Label>
              <Input id="folder-name-new" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter') await handleCreateFolder() }} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder}>Create</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
       <Dialog open={isAddIndustryDialogOpen} onOpenChange={setIsAddIndustryDialogOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>{industryToEdit ? 'Edit Custom Industry' : 'Add Custom Industry'}</DialogTitle>
                  <DialogDescription>
                    {industryToEdit ? 'Update the details for this custom industry.' : 'Create a new industry category for your contacts.'}
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="new-industry-name">Industry Description</Label>
                      <Input id="new-industry-name" value={newIndustryName} onChange={(e) => setNewIndustryName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="new-industry-code">Custom Code (Optional)</Label>
                      <Input id="new-industry-code" value={newIndustryCode} onChange={(e) => setNewIndustryCode(e.target.value)} placeholder="e.g., C-101" />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsAddIndustryDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleConfirmSaveIndustry}>{industryToEdit ? 'Save Changes' : 'Create Industry'}</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      <AlertDialog open={!!industryToDelete} onOpenChange={() => setIndustryToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the custom industry "{industryToDelete?.description}". This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteIndustry} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
}
