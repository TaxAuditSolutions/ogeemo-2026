
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
import { findOrCreateFileFolder, addTextFileClient, updateFile, getFileById } from '@/services/file-service';
import { type FileItem } from '@/data/files';
import { LoaderCircle } from 'lucide-react';

const userSchema = z.object({
  name: z.string().min(2, { message: 'Name is required.' }),
  email: z.string().email({ message: 'A valid email is required.' }),
  notes: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

// Helper function to parse content from the text file
const parseFileContent = (content: string): Partial<UserFormData> => {
    const data: Partial<UserFormData> = {};
    const nameMatch = content.match(/# User Profile: (.*)/);
    const emailMatch = content.match(/- \*\*Email:\*\* (.*)/);
    const notesMatch = content.match(/## Notes\n([\s\S]*)/);

    if (nameMatch) data.name = nameMatch[1].trim();
    if (emailMatch) data.email = emailMatch[1].trim();
    if (notesMatch) {
        const notesContent = notesMatch[1].trim();
        if (notesContent !== 'No notes provided.') {
            data.notes = notesContent;
        }
    }
    return data;
};


interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUserAdded: () => void;
  userToEdit: FileItem | null;
}

export function AddUserDialog({ isOpen, onOpenChange, onUserAdded, userToEdit }: AddUserDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: '', email: '', notes: '' },
  });

  useEffect(() => {
    const populateForm = async () => {
        if (userToEdit) {
            // Since the userToEdit from the list might not have content,
            // we may need to fetch it.
            if (userToEdit.content) {
                const parsedData = parseFileContent(userToEdit.content);
                form.reset(parsedData);
            } else {
                 try {
                    const fullFile = await getFileById(userToEdit.id);
                    if (fullFile?.content) {
                        const parsedData = parseFileContent(fullFile.content);
                        form.reset(parsedData);
                    }
                 } catch (error: any) {
                     toast({ variant: 'destructive', title: 'Error', description: `Failed to load user details: ${error.message}` });
                 }
            }
        } else {
            form.reset({ name: '', email: '', notes: '' });
        }
    };
    if (isOpen) {
      populateForm();
    }
  }, [isOpen, userToEdit, form, toast]);

  const onSubmit = async (values: UserFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in.' });
      return;
    }
    setIsSaving(true);
    try {
        const fileContent = `
# User Profile: ${values.name}

## Contact Information
- **Email:** ${values.email}

## Notes
${values.notes || 'No notes provided.'}
        `.trim();

        if (userToEdit) {
            // Update existing file
            await updateFile(userToEdit.id, {
                name: `${values.name}.txt`,
                content: fileContent,
            });
            toast({ title: 'User Updated', description: `Information for ${values.name} has been updated.` });
        } else {
            // Create new file
            const usersFolder = await findOrCreateFileFolder(user.uid, 'Users');
            await addTextFileClient(user.uid, usersFolder.id, `${values.name}.txt`, fileContent);
            toast({ title: 'User Record Created', description: `A file for ${values.name} has been saved.` });
        }
      
        onUserAdded();
        onOpenChange(false);

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
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
            {userToEdit ? 'Update the details for this user.' : 'Create a record for a new user.'}
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
                    {userToEdit ? 'Save Changes' : 'Save User'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
