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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { useFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { updateUserProfile, updateUserAuth, type UserProfile } from '@/services/user-profile-service';
import { LoaderCircle, Eye, EyeOff } from 'lucide-react';

const userSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.' }),
  email: z.string().email({ message: 'A valid email is required.' }),
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
  const { auth } = useFirebase();
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', password: '', notes: '' },
  });

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        form.reset({
          name: userToEdit.displayName || '',
          email: userToEdit.email || '',
          notes: userToEdit.notes || '',
          password: '',
        });
      } else {
        form.reset({ name: '', email: '', password: '', notes: '' });
      }
    }
  }, [isOpen, userToEdit, form]);

  const onSubmit = async (values: UserFormData) => {
    setIsSaving(true);
    try {
        if (userToEdit) {
            // Editing existing user
            const profileUpdateData: Partial<UserProfile> = {};
            if (values.name !== userToEdit.displayName) profileUpdateData.displayName = values.name;
            if (values.notes !== userToEdit.notes) profileUpdateData.notes = values.notes;

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
        } else {
            // Creating new user
            if (!auth) {
                throw new Error("Authentication service is not available.");
            }
            if (!values.password || values.password.length < 6) {
                form.setError('password', { message: 'Password must be at least 6 characters.' });
                setIsSaving(false);
                return;
            }
            
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const newUser = userCredential.user;
            
            await updateProfile(newUser, { displayName: values.name });
            
            await updateUserProfile(newUser.uid, newUser.email!, {
                displayName: values.name,
                email: newUser.email!,
                notes: values.notes,
            });
            
            toast({ title: 'User Created', description: `Account for ${values.name} has been created.` });
        }
      
        onUserAdded();
        onOpenChange(false);

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
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{userToEdit ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {userToEdit ? 'Update the details for this user.' : 'Create a new user account with login credentials.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{userToEdit ? 'New Password' : 'Password'}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? 'text' : 'password'}
                          placeholder={userToEdit ? "Leave blank to keep unchanged" : "••••••••"} 
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
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any relevant notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    {userToEdit ? 'Save Changes' : 'Create User'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
