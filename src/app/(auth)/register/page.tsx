
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Rocket, UserPlus } from 'lucide-react';

import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { TermsDialog } from '@/components/auth/terms-dialog';
import { findOrCreateFolder, addContact } from '@/services/contact-service';

const registerSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    businessName: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { toast } = useToast();
  const { firebaseServices } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", businessName: "" },
  });

  const handleInitialSubmit = (values: RegisterFormData) => {
    setFormData(values);
    setIsTermsDialogOpen(true);
  };

  const handleFinalSubmit = async () => {
    if (!formData || !firebaseServices) return;
    
    setIsLoading(true);
    try {
        // 1. Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(firebaseServices.auth, formData.email, formData.password);
        const user = userCredential.user;

        if (!user) {
            throw new Error("User creation failed.");
        }
        
        // 2. Update Auth profile display name
        await updateProfile(user, { displayName: formData.name });
        
        // 3. Find or create the "Subscribers to Ogeemo" folder
        const contactsFolder = await findOrCreateFolder(user.uid, "Subscribers to Ogeemo");

        // 4. Prepare and save the contact details
        const notes = `New user sign-up on ${new Date().toLocaleDateString()}.`;

        const newContactData = {
            name: formData.name,
            email: formData.email,
            businessName: formData.businessName,
            folderId: contactsFolder.id,
            notes: notes.trim(),
            userId: user.uid,
        };

        await addContact(newContactData);

        toast({
            title: "Welcome to Ogeemo!",
            description: "Your account has been created successfully.",
        });
        
        // The AuthProvider will handle the redirect to the action manager automatically

    } catch (error: any) {
        let description = "An unknown error occurred. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            description = "This email is already associated with an account.";
        }
        toast({
            variant: "destructive",
            title: "Registration Failed",
            description: description,
        });
    } finally {
        setIsLoading(false);
        setIsTermsDialogOpen(false);
        setFormData(null);
    }
  }

  return (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline font-semibold">Create Your Ogeemo Account</CardTitle>
        <CardDescription>
            Enter your information below to create your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleInitialSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Your Name</FormLabel> <FormControl><Input placeholder="John Doe" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input placeholder="name@example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="businessName" render={({ field }) => ( <FormItem> <FormLabel>Business Name (Optional)</FormLabel> <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <p className="text-xs text-center text-muted-foreground pt-2">
                    By creating an account, you agree to our <Link href="/terms" target="_blank" className="underline">Terms of Service</Link>.
                </p>
                <Button type="submit" className="w-full">
                    Create Account
                </Button>
            </form>
        </Form>
      </CardContent>
       <CardFooter className="justify-center text-sm">
        <p>
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
            </Link>
        </p>
      </CardFooter>

      <TermsDialog
        isOpen={isTermsDialogOpen}
        onOpenChange={setIsTermsDialogOpen}
        onConfirm={handleFinalSubmit}
        isSubmitting={isLoading}
      />
    </>
  );
}
