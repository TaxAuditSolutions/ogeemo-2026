'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateUserAuth } from '@/core/user-profile-service';
import { LoaderCircle, Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export function ChangePasswordPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: PasswordFormData) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'No User Logged In' });
        return;
    }
    setIsSaving(true);
    try {
        const result = await updateUserAuth(user.uid, { password: values.password });
        console.log('Password update function returned successfully with result:', result);
        toast({ title: 'Password Updated', description: `Your password has been changed successfully.` });
        form.reset();
        // Optional: Redirect after success or just stay on page
    } catch (error: any) {
        console.error('Password update failed. Full error object:', error);
        toast({ 
            variant: 'destructive', 
            title: 'Update Failed', 
            description: `Code: ${error.code || 'N/A'}. Message: ${error.message || 'An unknown error occurred.'}. Details: ${JSON.stringify(error.details)}` 
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-100px)] p-4">
      <Card className="w-full max-w-md relative">
        <Button asChild variant="ghost" size="icon" className="absolute right-2 top-2">
            <Link href="/" aria-label="Close">
                <X className="h-4 w-4" />
            </Link>
        </Button>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Enter a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            {...field}
                        />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" asChild disabled={isSaving}>
                    <Link href="/">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Save Password
                </Button>
                </div>
            </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
