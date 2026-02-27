'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { updateUserProfile, updateUserAuth, type UserProfile } from '@/services/user-profile-service';
import { getContacts, updateContact, type Contact } from '@/services/contact-service';
import { getFolders, type FolderData } from '@/services/contact-folder-service';
import { LoaderCircle, Eye, EyeOff, UserPlus, ChevronsUpDown, Check, Search, X, Users, Pencil, Save, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const userSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.' }),
  email: z.string().email({ message: 'A valid email is required.' }),
  employeeNumber: z.string().optional(),
  password: z.string().optional(),
  notes: z.string().optional(),
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
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isContactPopoverOpen, setIsContactPopoverOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const { auth, user: currentUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', employeeNumber: '', password: '', notes: '' },
  });

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
        console.error("Failed to load contacts for member creation:", error);
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
        form.reset({
          name: userToEdit.displayName || '',
          email: userToEdit.email || '',
          employeeNumber: userToEdit.employeeNumber || '',
          notes: userToEdit.notes || '',
          password: '',
        });
      } else {
        form.reset({ name: '', email: '', employeeNumber: '', password: '', notes: '' });
        setSelectedContactId(null);
      }
    }
  }, [isOpen, userToEdit, form]);

  const handleSelectContact = (contact: Contact) => {
      setSelectedContactId(contact.id);
      form.setValue('name', contact.name);
      form.setValue('email', contact.email || '');
      form.setValue('employeeNumber', contact.employeeNumber || '');
      form.setValue('notes', contact.notes || '');
      setIsContactPopoverOpen(false);
      toast({ title: "Contact Linked", description: `Pre-filled data for ${contact.name}.` });
  };

  const clearSelection = () => {
      setSelectedContactId(null);
      form.reset({ name: '', email: '', employeeNumber: '', password: '', notes: '' });
  };

  const onSubmit = async (values: UserFormData) => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
        if (userToEdit) {
            // Editing existing user
            const profileUpdateData: Partial<UserProfile> = {};
            if (values.name !== userToEdit.displayName) profileUpdateData.displayName = values.name;
            if (values.notes !== userToEdit.notes) profileUpdateData.notes = values.notes;
            if (values.employeeNumber !== userToEdit.employeeNumber) profileUpdateData.employeeNumber = values.employeeNumber;

            const authUpdateData: { email?: string; password?: string } = {};
            if (values.email !== userToEdit.email) authUpdateData.email = values.email;
            if (values.password && values.password.length >= 6) {
                authUpdateData.password = values.password;
            } else if (values.password && values.password.length > 0) {
                form.setError('password', { message: 'New password must be at least 6 characters.' });
                setIsSaving(false);
                return;
            }

            await Promise.all([
                Object.keys(profileUpdateData).length > 0 ? updateUserProfile(userToEdit.id, userToEdit.email, profileUpdateData) : Promise.resolve(),
                Object.keys(authUpdateData).length > 0 ? updateUserAuth(userToEdit.id, authUpdateData) : Promise.resolve(),
            ]);

            toast({ title: 'User Updated', description: `Information for ${values.name} has been updated.` });
            onUserAdded();
            onOpenChange(false);
        } else {
            // Creating new user
            if (!auth) throw new Error("Authentication service is not available.");
            if (!values.password || values.password.length < 6) {
                form.setError('password', { message: 'Password must be at least 6 characters.' });
                setIsSaving(false);
                return;
            }
            
            // Note: This signs out the Admin if not handled via a background process.
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const newUser = userCredential.user;
            
            await updateProfile(newUser, { displayName: values.name });
            
            // Move contact to "Ogeemo Users" if promoting existing contact
            if (selectedContactId) {
                const usersFolder = folders.find(f => f.name === 'Ogeemo Users' && f.isSystem);
                if (usersFolder) {
                    await updateContact(selectedContactId, { folderId: usersFolder.id });
                }
            }

            await updateUserProfile(newUser.uid, newUser.email!, {
                displayName: values.name,
                email: newUser.email!,
                employeeNumber: values.employeeNumber,
                notes: values.notes,
                role: 'viewer', 
            });
            
            toast({ title: 'User Created', description: `Account for ${values.name} has been created.` });
            onUserAdded();
            onOpenChange(false);
        }

    } catch (error: any) {
        let description = error.message || 'An unexpected error occurred.';
        if (error.code === 'auth/email-already-in-use') {
            description = "This email is already in use by another account.";
        }
        toast({ variant: 'destructive', title: 'Save Failed', description });
    } finally {
      setIsSaving(false);
    }
  };
  
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            {userToEdit ? 'Edit User Profile' : 'Add New Member'}
          </DialogTitle>
          <DialogDescription>
            {userToEdit ? 'Update the details for this user.' : 'Grant system access to a team member or promote an existing contact.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-4">
                {!userToEdit && (
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            <Search className="h-3 w-3" /> 1. Promote Existing Contact (Optional)
                        </Label>
                        <div className="flex gap-2">
                            <Popover open={isContactPopoverOpen} onOpenChange={setIsContactPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="flex-1 justify-between text-sm font-normal">
                                        <div className="flex items-center gap-2 truncate">
                                            <Users className="h-4 w-4 opacity-50" />
                                            {selectedContact ? selectedContact.name : "Search all contacts..."}
                                        </div>
                                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                        <CommandInput placeholder="Type to filter..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                {isLoadingContacts ? (
                                                    <div className="p-4 flex items-center justify-center gap-2 text-xs">
                                                        <LoaderCircle className="h-3 w-3 animate-spin" /> Indexing...
                                                    </div>
                                                ) : "No contact found."}
                                            </CommandEmpty>
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
                            {selectedContactId && (
                                <Button variant="ghost" size="icon" onClick={clearSelection} title="Clear selection">
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <Separator />

                <Form {...form}>
                    <form id="add-user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                            <Pencil className="h-3 w-3" /> 2. Verify Member Details
                        </Label>
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
                        <FormField
                            control={form.control}
                            name="employeeNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>User ID / Employee #</FormLabel>
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
                                    <FormLabel>{userToEdit ? 'New Password (Optional)' : 'Access Password'}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input 
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder={userToEdit ? "Leave blank to keep current" : "Minimum 6 characters"} 
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
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Internal Notes</FormLabel>
                                    <FormControl><Textarea placeholder="Permissions rationale, start dates, etc." className="resize-none" rows={3} {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </div>
        </ScrollArea>

        <DialogFooter className="p-6 border-t bg-muted/10 shrink-0">
            <div className="hidden sm:flex flex-1 items-center gap-2 text-xs text-muted-foreground italic">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span>Creating a user will generate a new login account immediately.</span>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" form="add-user-form" disabled={isSaving} className="font-bold shadow-md">
                    {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {userToEdit ? 'Save Changes' : 'Create Login & Link Contact'}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
