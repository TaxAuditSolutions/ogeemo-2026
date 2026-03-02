'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import firebaseConfig from '@/lib/config';
import { updateUserProfile, type UserProfile } from '@/services/user-profile-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { LoaderCircle, Eye, EyeOff, Search, UserPlus, ChevronsUpDown, Check, X, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

const userSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.' }),
  email: z.string().email({ message: 'A valid email is required.' }),
  employeeNumber: z.string().optional(),
  password: z.string().optional(),
  notes: z.string().optional(),
  role: z.enum(['admin', 'editor', 'viewer', 'none']).default('viewer'),
});

type UserFormData = z.infer<typeof userSchema>;

interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUserAdded: () => void;
  userToEdit: UserProfile | null;
}

export function AddUserDialog({ isOpen, onOpenChange, onUserAdded, userToEdit }: AddUserDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const formMethods = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      employeeNumber: '',
      password: '',
      notes: '',
      role: 'viewer',
    },
  });

  const { reset, handleSubmit, setValue, setError } = formMethods;

  const loadContacts = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingContacts(true);
    try {
        const fetchedContacts = await getContacts();
        setContacts(fetchedContacts);
    } catch (error) {
        // Error is centrally handled by the FirebaseErrorListener
    } finally {
        setIsLoadingContacts(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      if (userToEdit) {
        reset({
          name: userToEdit.displayName || '',
          email: userToEdit.email || '',
          employeeNumber: userToEdit.employeeNumber || '',
          notes: userToEdit.notes || '',
          password: '',
          role: userToEdit.role || 'viewer',
        });
        setSelectedContactId(null);
      } else {
        reset({ name: '', email: '', employeeNumber: '', password: '', notes: '', role: 'viewer' });
        setSelectedContactId(null);
      }
    }
  }, [isOpen, userToEdit, reset, loadContacts]);

  const handleSelectContact = (contact: Contact) => {
      setSelectedContactId(contact.id);
      setValue('name', contact.name);
      setValue('email', contact.email || '');
      setValue('employeeNumber', contact.employeeNumber || '');
      setIsContactPopoverOpen(false);
      toast({ title: "Contact Selected", description: `Pre-filled details for ${contact.name}.` });
  };

  const handleClearSelection = () => {
      setSelectedContactId(null);
      setValue('name', '');
      setValue('email', '');
      setValue('employeeNumber', '');
  };

  const onSubmit = async (values: UserFormData) => {
    if (!currentUser) return;
    setIsSaving(true);
    let secondaryApp;
    try {
        if (userToEdit) {
            await updateUserProfile(userToEdit.id, values.email, {
                displayName: values.name,
                employeeNumber: values.employeeNumber,
                notes: values.notes,
                role: values.role,
            });
            toast({ title: 'User Updated' });
        } else {
            if (!values.password || values.password.length < 6) {
                setError('password', { message: 'Password must be at least 6 characters.' });
                setIsSaving(false);
                return;
            }

            const secondaryAppName = `Secondary-${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
            const secondaryAuth = getAuth(secondaryApp);
            
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.password);
            const newUser = userCredential.user;
            await updateProfile(newUser, { displayName: values.name });

            await updateUserProfile(newUser.uid, newUser.email!, {
                displayName: values.name,
                email: newUser.email!,
                employeeNumber: values.employeeNumber,
                notes: values.notes,
                role: values.role,
            });
            
            await signOut(secondaryAuth);
            await deleteApp(secondaryApp);
            secondaryApp = null;
            toast({ title: 'User Created' });
        }
        onUserAdded();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    } finally {
      if (secondaryApp) try { await deleteApp(secondaryApp); } catch (e) {}
      setIsSaving(false);
    }
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0 overflow-hidden text-black">
        <DialogHeader className="p-6 shrink-0 border-b bg-muted/10 text-center sm:text-center">
          <div className="flex items-center justify-center gap-3 text-primary mb-1">
              <UserPlus className="h-6 w-6" />
              <DialogTitle className="text-2xl font-headline uppercase tracking-tight">
                {userToEdit ? 'Edit User Node' : 'Add New User Node'}
              </DialogTitle>
          </div>
          <DialogDescription>
            {userToEdit ? 'Update the identity and authority levels for this user.' : 'Link a contact from your directory or create a new system identity.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto w-full">
                {!userToEdit && (
                    <div className="px-6 py-6 bg-primary/5 border-b space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            <Search className="h-3.5 w-3.5" /> 1. Select from Contact Directory (All Contacts)
                        </Label>
                        <div className="flex gap-2">
                            <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between bg-white h-12">
                                        <span className="truncate">
                                            {selectedContact ? selectedContact.name : "Search existing contacts..."}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search name or email..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                {isLoadingContacts ? <LoaderCircle className="h-4 w-4 animate-spin mx-auto" /> : "No contact found."}
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {contacts.map((contact) => (
                                                    <CommandItem
                                                        key={contact.id}
                                                        value={`${contact.name} ${contact.email}`}
                                                        onSelect={() => handleSelectContact(contact)}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedContactId === contact.id ? "opacity-100" : "opacity-0")} />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{contact.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{contact.email}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {selectedContactId && (
                                <Button variant="ghost" size="icon" className="h-12 w-12" onClick={handleClearSelection} title="Clear Selection">
                                    <X className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <Form {...formMethods}>
                    <form id="add-user-form" onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-2">
                                {userToEdit ? "User Details" : "2. Identity Credentials"}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={formMethods.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Full Legal Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="John Doe" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={formMethods.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email Identity <span className="text-destructive">*</span></FormLabel><FormControl><Input type="email" placeholder="email@example.com" {...field} readOnly={!!userToEdit} className={cn("h-11", userToEdit && "bg-muted/50")} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={formMethods.control} name="employeeNumber" render={({ field }) => ( <FormItem><FormLabel>Original ID / Employee #</FormLabel><FormControl><Input placeholder="e.g. 1001" {...field} className="h-11" /></FormControl><FormMessage /></FormItem> )} />
                                {!userToEdit && (
                                    <FormField control={formMethods.control} name="password" render={({ field }) => (
                                        <FormItem><FormLabel>Access Password <span className="text-destructive">*</span></FormLabel><FormControl><div className="relative"><Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} className="h-11" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></FormControl><FormDescription className="text-xs">Minimum 6 characters for cloud security.</FormDescription><FormMessage /></FormItem>
                                    )} />
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground border-b pb-2">Authority & Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={formMethods.control} name="role" render={({ field }) => (
                                    <FormItem><FormLabel>Authority Level (Role)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="admin">Admin (Full Orchestration)</SelectItem><SelectItem value="editor">Editor (Operational Access)</SelectItem><SelectItem value="viewer">Viewer (Read-Only Intelligence)</SelectItem><SelectItem value="none">No Access (Revoked Node)</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={formMethods.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Administrative Notes</FormLabel><FormControl><Textarea placeholder="Background info or specific permission rationale..." rows={5} className="resize-none" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    </form>
                </Form>
            </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-muted/10 shrink-0 sm:justify-between items-center">
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground italic font-medium">
            <Info className="h-4 w-4 text-primary" />
            <span>Provisioning a new user node establishes a secure identity in the Ogeemo Cloud.</span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={isSaving} className="h-12 px-8">Cancel</Button>
            <Button type="submit" form="add-user-form" size="lg" className="px-12 font-bold shadow-xl" disabled={isSaving}>
                {isSaving ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                {userToEdit ? 'Save Changes' : 'Provision User'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
