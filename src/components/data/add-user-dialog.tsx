
'use client';

import React, { useState } from 'react';
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
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { findOrCreateFileFolder, addTextFileClient } from '@/services/file-service';
import { LoaderCircle } from 'lucide-react';

const userSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.' }),
  email: z.string().email({ message: 'A valid email is required.' }),
  notes: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUserAdded: () => void; // Callback function
}

export function AddUserDialog({ isOpen, onOpenChange, onUserAdded }: AddUserDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      notes: '',
    },
  });

  const onSubmit = async (values: UserFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in.' });
      return;
    }
    setIsSaving(true);
    try {
      const usersFolder = await findOrCreateFileFolder(user.uid, 'Users');

      const fileContent = `
# User Profile: ${values.name}

## Contact Information
- **Email:** ${values.email}

## Notes
${values.notes || 'No notes provided.'}
      `.trim();

      await addTextFileClient(user.uid, usersFolder.id, `${values.name}.txt`, fileContent);
      
      toast({
        title: 'User File Created',
        description: `A file for ${values.name} has been saved to your "Users" folder in the Document Manager.`,
      });
      
      onUserAdded(); // Trigger the callback
      onOpenChange(false);
      form.reset();

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to save user', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Reset form when dialog is closed
  React.useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a record for a new user. This will save their information as a file in your Document Manager.
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
                    Save User
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
