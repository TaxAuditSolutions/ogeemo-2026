'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
        setContacts(fetchedContacts);
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

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', employeeNumber: '', password: '', notes: '', role: 'viewer' },
  });

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
  }, [isOpen, userToEdit, contactToPromote, form]);

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
        const usersFolder = folders.find(f => f.name === 'Users' && f.isSystem);
        const existingProfile = await getUserProfileByEmail(values.email);

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
                    employeeNumber: values.employeeNumber,
                });
            }

            toast({ title: 'Authority Synchronized', description: `${values.name} already has an account node. Permissions updated.` });
            onUserAdded();
            onOpenChange(false);
            return;
        }

        if (mode !== 'edit' && (!values.password || values.password.length < 6)) {
            form.setError('password', { message: 'Password must be at least 6 characters.' });
            setIsSaving(false);
            return;
        }

        const secondaryAppName = `Secondary-${Date.now()}`;
        secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);
        
        try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.password!);
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
                    employeeNumber: values.employeeNumber,
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
                toast({ variant: 'destructive', title: 'Account Conflict', description: "This email exists in Authentication. Synchronizing authority now..." });
                const profile = await getUserProfileByEmail(values.email);
                if (profile) {
                    await updateUserProfile(profile.id, values.email, { 
                        role: values.role, 
                        employeeNumber: values.employeeNumber,
                    });
                    onUserAdded();
                    onOpenChange(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0 overflow-hidden text-black">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/10 text-center sm:text-center shrink-0 relative">
          <DialogTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <UserPlus className="h-8 w-8 text-primary" />
            {mode === 'edit' ? 'Edit User Profile' : 'Add New Ogeemo User'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {mode === 'edit' ? 'Update secure details for this operational node.' : 'Establish credentials and authority for a new team member.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
            <div className="max-w-4xl mx-auto py-10 px-6 space-y-10">
                {mode !== 'edit' && (
                    <div className="space-y-4 p-6 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20">
                        <Label className="text-sm uppercase font-bold text-primary flex items-center gap-2 mb-4">
                            1. Operational Context
                        </Label>
                        <RadioGroup 
                            defaultValue="new" 
                            value={mode} 
                            onValueChange={(v) => setMode(v as any)}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        >
                            <div className={cn("flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer", mode === 'new' ? "bg-white border-primary shadow-md" : "bg-muted/50 border-transparent")}>
                                <RadioGroupItem value="new" id="mode-new" />
                                <Label htmlFor="mode-new" className="font-bold cursor-pointer text-base">New Identity</Label>
                            </div>
                            <div className={cn("flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer", mode === 'promote' ? "bg-white border-primary shadow-md" : "bg-muted/50 border-transparent")}>
                                <RadioGroupItem value="promote" id="mode-promote" />
                                <Label htmlFor="mode-promote" className="font-bold cursor-pointer text-base">Promote Existing Contact</Label>
                            </div>
                        </RadioGroup>

                        {mode === 'promote' && (
                            <div className="pt-4 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Search Directory</Label>
                                <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full h-12 justify-between text-base font-normal px-4">
                                            <div className="flex items-center gap-3 truncate">
                                                <Users className="h-5 w-5 text-primary opacity-70" />
                                                {selectedContactId ? contacts.find(c => c.id === selectedContactId)?.name : "Find contact to promote..."}
                                            </div>
                                            <ChevronsUpDown className="h-5 w-5 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                            <CommandInput placeholder="Search name or business..." value={contactSearchValue} onValueChange={setContactSearchValue} className="h-12" />
                                            <CommandList className="max-h-[300px]">
                                                <CommandEmpty>No directory match found.</CommandEmpty>
                                                <CommandGroup>
                                                    {contacts.map(c => (
                                                        <CommandItem 
                                                            key={c.id} 
                                                            value={c.name}
                                                            onSelect={() => handleSelectContact(c)}
                                                            className="py-3"
                                                        >
                                                            <Check className={cn("mr-3 h-5 w-5", selectedContactId === c.id ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{c.name}</span>
                                                                <span className="text-xs text-muted-foreground">{c.email || 'No Email Record'}</span>
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

                <Form {...form}>
                    <form id="add-user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                        <section className="space-y-6">
                            <h3 className="text-sm uppercase font-bold text-primary tracking-widest flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" />
                                2. Credentials & Registry
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Full Legal Name</FormLabel>
                                            <FormControl><Input placeholder="John Smith" className="h-12 text-lg" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Login Email</FormLabel>
                                            <FormControl><Input type="email" placeholder="john@ogeemo.biz" className="h-12 text-lg" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="employeeNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">Operational ID / Employee #</FormLabel>
                                            <FormControl><Input placeholder="e.g. U-1001" className="h-12 text-lg font-mono" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-bold">{mode === 'edit' ? 'New Password (Optional)' : 'Secure Password'}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder={mode === 'edit' ? "Leave blank to keep current" : "Minimum 6 characters"} 
                                                        className="h-12 text-lg pr-12"
                                                        {...field} 
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </Button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </section>

                        <Separator />

                        <section className="space-y-6">
                            <h3 className="text-sm uppercase font-bold text-primary tracking-widest flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                3. Authority & Scope
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-1 space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold">Access Level</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-12 text-base border-2">
                                                            <SelectValue placeholder="Assign level..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="admin">Admin (Full Control)</SelectItem>
                                                        <SelectItem value="editor">Editor (Standard Ops)</SelectItem>
                                                        <SelectItem value="viewer">Viewer (Intelligence)</SelectItem>
                                                        <SelectItem value="none">No Access (Revoked)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="p-4 bg-muted/50 rounded-xl border border-dashed text-xs text-muted-foreground space-y-2">
                                        <p className="flex items-center gap-2 font-bold text-primary">
                                            <Info className="h-3.5 w-3.5" /> Authority Guide
                                        </p>
                                        <p><strong>Admin:</strong> Complete platform orchestration.</p>
                                        <p><strong>Editor:</strong> Manage contacts, BKS, and projects.</p>
                                        <p><strong>Viewer:</strong> Intelligence and report access only.</p>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold">Notes</FormLabel>
                                                <FormControl><Textarea placeholder="Background, internal context, or special access requirements..." className="resize-none text-base leading-relaxed" rows={8} {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </section>
                    </form>
                </Form>
            </div>
        </ScrollArea>

        <DialogFooter className="p-8 border-t bg-muted/10 shrink-0 sm:justify-between items-center gap-6">
            <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground italic font-medium max-w-lg">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <span>Synchronizing user identity with the master registry and Firebase Authentication. This operation is encrypted.</span>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
                <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={isSaving} className="h-14 px-10 text-lg">Cancel</Button>
                <Button type="submit" form="add-user-form" disabled={isSaving} size="lg" className="h-14 px-12 text-xl font-bold shadow-xl">
                    {isSaving ? <LoaderCircle className="mr-3 h-6 w-6 animate-spin" /> : <Save className="mr-3 h-6 w-6" />}
                    {mode === 'edit' ? 'Update Profile' : 'Save User Node'}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
