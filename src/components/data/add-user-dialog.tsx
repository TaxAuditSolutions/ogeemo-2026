'use client';

import React, { useState, useEffect } from 'react';
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
import { updateUserProfile, type UserProfile } from '@/services/user-profile-service';
import { LoaderCircle, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', employeeNumber: '', password: '', notes: '', role: 'viewer' },
  });

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        form.reset({
          name: userToEdit.displayName || '',
          email: userToEdit.email || '',
          employeeNumber: userToEdit.employeeNumber || '',
          notes: userToEdit.notes || '',
          password: '',
          role: userToEdit.role || 'viewer',
        });
      } else {
        form.reset({ name: '', email: '', employeeNumber: '', password: '', notes: '', role: 'viewer' });
      }
    }
  }, [isOpen, userToEdit, form]);

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
                form.setError('password', { message: 'Password must be at least 6 characters.' });
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{userToEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {userToEdit ? 'Update the user profile.' : 'Create a new authenticated user for your team.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={form.control} name="employeeNumber" render={({ field }) => ( <FormItem><FormLabel>Employee #</FormLabel><FormControl><Input placeholder="e.g. 1001" {...field} /></FormControl><FormMessage /></FormItem> )} />
            {!userToEdit && (
                <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>Password</FormLabel><FormControl><div className="relative"><Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></FormControl><FormMessage /></FormItem>
                )} />
            )}
            <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="editor">Editor</SelectItem><SelectItem value="viewer">Viewer</SelectItem><SelectItem value="none">No Access</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Background or permissions notes..." {...field} /></FormControl><FormMessage /></FormItem> )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}{userToEdit ? 'Save Changes' : 'Create User'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}