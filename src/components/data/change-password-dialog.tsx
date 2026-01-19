
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { type UserProfile } from '@/services/user-profile-service';
import { updateUserAuth } from '@/services/user-profile-service';
import { LoaderCircle, Eye, EyeOff } from 'lucide-react';

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type PasswordFormData = z.infer<typeof passwordSchema>;

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: UserProfile | null;
  onPasswordChanged: () => void;
}

export function ChangePasswordDialog({ isOpen, onOpenChange, user, onPasswordChanged }: ChangePasswordDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ password: '' });
    }
  }, [isOpen, form]);

  const onSubmit = async (values: PasswordFormData) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'No User Selected' });
        return;
    }
    setIsSaving(true);
    try {
        await updateUserAuth(user.id, { password: values.password });
        toast({ title: 'Password Updated', description: `The password for ${user.displayName} has been changed.` });
        onPasswordChanged();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message || "An unknown error occurred." });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password for {user?.displayName}</DialogTitle>
          <DialogDescription>
            Enter a new password for this user.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
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
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Save Password
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
