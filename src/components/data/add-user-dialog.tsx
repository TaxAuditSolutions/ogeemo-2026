
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
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import firebaseConfig from '@/lib/config';
import { updateUserProfile, updateUserAuth, getUserProfileByEmail, type UserProfile, type UserRole } from '@/services/user-profile-service';
import { getContacts, updateContact, addContact, type Contact } from '@/services/contact-service';
import { getFolders, type FolderData } from '@/services/contact-folder-service';
import { 
    LoaderCircle, 
    Eye, 
    EyeOff, 
    UserPlus, 
    ChevronsUpDown, 
    Check, 
    Users, 
    Save, 
    Info, 
    ShieldAlert, 
    ShieldCheck, 
    Lock,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  contactToPromote?: Contact | null;
}

export function AddUserDialog({ isOpen, onOpenChange, onUserAdded, userToEdit, contactToPromote }: AddUserDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'new' | 'promote' | 'edit'>('new');
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactSearchValue, setContactSearchValue] = useState("");

  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const loadSupportData = useCallback(async () => {
    if (!currentUser || !isOpen) return;
    setIsLoadingContacts(true);
    try {
        const [fetchedContacts, fetchedFolders] = await Promise.all([
            getContacts(currentUser.uid),
            getFolders(currentUser.uid)
        ]);
        // Filter out system identities to avoid promoting protected nodes
        setContacts(fetchedContacts.filter(c => c.setupSource !== 'system'));
        setFolders(fetchedFolders);
    } catch (error) {
        console.error("Failed to load support data:", error);
    } finally {
        setIsLoadingContacts(false);
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    loadSupportData();
  }, [loadSupportData]);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        setMode('edit');
        form.reset({
          name: userToEdit.displayName || '',
          email: userToEdit.email || '',
          employeeNumber: userToEdit.employeeNumber || '',
          notes: userToEdit.notes || '',
          password: '',
          role: userToEdit.role || 'viewer',
        });
      } else if (contactToPromote) {
        setMode('promote');
        setSelectedContactId(contactToPromote.id);
        form.reset({
          name: contactToPromote.name || '',
          email: contactToPromote.email || '',
          employeeNumber: contactToPromote.employeeNumber || '',
          notes: contactToPromote.notes || '',
          password: '',
          role: (contactToPromote.role as any) || 'viewer',
        });
      } else {
        form.reset({ name: '', email: '', employeeNumber: '', password: '', notes: '', role: 'viewer' });
        setSelectedContactId(null);
        setMode('new');
      }
    }
  }, [isOpen, userToEdit, contactToPromote]);

  const handleSelectContact = (contact: Contact) => {
      setSelectedContactId(contact.id);
      form.setValue('name', contact.name);
      form.setValue('email', contact.email || '');
      form.setValue('employeeNumber', contact.employeeNumber || '');
      form.setValue('notes', contact.notes || '');
      setIsContactPopoverOpen(false);
      toast({ title: "Contact Linked", description: `Pre-filled data for ${contact.name}.` });
  };

  const onSubmit = async (values: UserFormData) => {
    if (!currentUser) return;
    setIsSaving(true);
    let secondaryApp;
    try {
        const usersFolder = folders.find(f => f.name === 'Ogeemo Users' && f.isSystem);

        if (existingProfile) {
            await updateUserProfile(existingProfile.id, values.email, {
                role: values.role,
                employeeNumber: values.employeeNumber,
                displayName: values.name,
                notes: values.notes,
            });

            const linkId = selectedContactId || (contactToPromote?.id);
            if (linkId) {
                await updateContact(linkId, { 
                    folderId: usersFolder?.id, 
                    role: values.role,
                    employeeNumber: values.employeeNumber
                });
            }

            toast({ title: 'Authority Synchronized', description: `${values.name} already has an account node. Permissions updated.` });
            onUserAdded();
            onOpenChange(false);
            return;
        }

        // Standard creation logic
        if (!values.password || values.password.length < 6) {
            form.setError('password', { message: 'Password must be at least 6 characters.' });
            setIsSaving(false);
            return;
        }

        const secondaryAppName = `Secondary-${Date.now()}`;
        secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
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

            const linkId = selectedContactId || (contactToPromote?.id);
            if (linkId) {
                await updateContact(linkId, { 
                    folderId: usersFolder?.id, 
                    role: values.role,
                    employeeNumber: values.employeeNumber
                });
            } else {
                await addContact({
                    name: values.name,
                    email: values.email,
                    employeeNumber: values.employeeNumber,
                    folderId: usersFolder?.id || '',
                    role: values.role,
                    userId: currentUser.uid, 
                });
            }
            
            await signOut(secondaryAuth);
            await deleteApp(secondaryApp);
            secondaryApp = null;

            toast({ title: 'User Created', description: `${values.name} added to team.` });
            onUserAdded();
            onOpenChange(false);
        } catch (authError: any) {
            if (authError.code === 'auth/email-already-in-use') {
                if (values.email.toLowerCase() === currentUser.email?.toLowerCase()) {
                    await updateUserProfile(currentUser.uid, values.email, {
                        role: values.role,
                        employeeNumber: values.employeeNumber,
                        displayName: values.name,
                        notes: values.notes,
                    });
                    toast({ title: 'Profile Synchronized', description: "Your existing account has been promoted to your contact node." });
                    onUserAdded();
                    onOpenChange(false);
                } else {
                    toast({ variant: 'destructive', title: 'Account Conflict', description: "This email exists in Authentication. Synchronizing authority now..." });
                    // Attempt profile update anyway
                    const profile = await getUserProfileByEmail(values.email);
                    if (profile) {
                        await updateUserProfile(profile.id, values.email, { role: values.role, employeeNumber: values.employeeNumber });
                        onUserAdded();
                        onOpenChange(false);
                    }
                }
            } else { throw authError; }
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    } finally {
      if (secondaryApp) try { await deleteApp(secondaryApp); } catch (e) {}
      setIsSaving(false);
    }
  };

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', employeeNumber: '', password: '', notes: '', role: 'viewer' },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b bg-muted/10 text-center sm:text-center">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            {mode === 'edit' ? 'Edit User Profile' : 'Add New User'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update details for this user.' : 'Set credentials and authority for this team member.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-4">
                {mode !== 'edit' && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-xl border">
                        <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            1. Select Creation Mode
                        </Label>
                        <RadioGroup 
                            defaultValue="new" 
                            value={mode} 
                            onValueChange={(v) => setMode(v as any)}
                            className="flex flex-col space-y-2"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="new" id="mode-new" />
                                <Label htmlFor="mode-new" className="font-semibold cursor-pointer">Create Brand New User</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="promote" id="mode-promote" />
                                <Label htmlFor="mode-promote" className="font-semibold cursor-pointer">Promote Existing Contact</Label>
                            </div>
                        </RadioGroup>

                        {mode === 'promote' && (
                            <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                                <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between text-sm font-normal">
                                            <div className="flex items-center gap-2 truncate">
                                                <Users className="h-4 w-4 opacity-50" />
                                                {selectedContactId ? contacts.find(c => c.id === selectedContactId)?.name : "Search directory..."}
                                            </div>
                                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                            <CommandInput placeholder="Search name or business..." value={contactSearchValue} onValueChange={setContactSearchValue} />
                                            <CommandList>
                                                <CommandEmpty>No contact found.</CommandEmpty>
                                                <CommandGroup>
                                                    {contacts.map(c => (
                                                        <CommandItem 
                                                            key={c.id} 
                                                            value={c.name}
                                                            onSelect={() => handleSelectContact(c)}
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{c.name}</span>
                                                                <span className="text-[10px] text-muted-foreground">{c.email || 'No email set'}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                    </div>
                )}

                <Separator />

                <Form {...form}>
                    <form id="add-user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-widest text-primary">Credentials & Identity</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Login Email</FormLabel>
                                            <FormControl><Input type="email" placeholder="jane.doe@example.com" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="employeeNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Original ID / Employee #</FormLabel>
                                            <FormControl><Input placeholder="e.g. U-1001" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{mode === 'edit' ? 'New Password (Optional)' : 'Set Password'}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder={mode === 'edit' ? "Keep current" : "Min 6 characters"} 
                                                        {...field} 
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <Label className="text-xs font-bold uppercase tracking-widest text-primary">Authority Level</Label>
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Assign authority level..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="admin">Admin (Full Orchestration)</SelectItem>
                                                <SelectItem value="editor">Read/Edit (Operational)</SelectItem>
                                                <SelectItem value="viewer">Read Only (Intelligence)</SelectItem>
                                                <SelectItem value="none">No Access (Revoked)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes</FormLabel>
                                        <FormControl><Textarea placeholder="Internal records..." className="resize-none" rows={3} {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </form>
                </Form>
            </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="add-user-form" disabled={isSaving} className="font-bold shadow-md">
                {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {mode === 'edit' ? 'Update User' : 'Save User Node'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
