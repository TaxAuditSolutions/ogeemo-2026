"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { UserPlus, Loader2 } from 'lucide-react';

import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { registerOrganization } from '@/app/actions/org-actions';
import { MEMBERSHIP_FEE } from '@/lib/constants';

const registerSchema = z.object({
    orgName: z.string().min(2, { message: "Organization name must be at least 2 characters." }),
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { auth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { orgName: "", name: "", email: "", password: "" },
  });

  const onSubmit = async (data: RegisterFormData) => {
    if (!auth) {
        toast({ variant: "destructive", title: "Error", description: "Authentication service not initialized." });
        return;
    }
    
    setIsLoading(true);
    try {
        // 1. Call Server Action to register organization and create user
        const result = await registerOrganization({
            orgName: data.orgName,
            email: data.email,
            password: data.password,
            name: data.name,
        });

        if (result.success) {
            // 2. Immediately sign in the user via Firebase Auth client SDK
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
            
            // 3. 🌟 CRITICAL STEP: Mint the Server-Side Session Cookie
            const idToken = await userCredential.user.getIdToken();
            const sessionResponse = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (!sessionResponse.ok) {
                throw new Error("Failed to create secure session.");
            }
            
            toast({
                title: "Welcome Home to Ogeemo!",
                description: `Organization "${data.orgName}" successfully created.`,
            });
            
            // 4. Redirect to dashboard and refresh Server Components
            router.push('/welcome');
            router.refresh(); 
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Registration Failed",
            description: error.message || "An unknown error occurred. Please try again.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline font-semibold">Join the Ogeemo Circle</CardTitle>
        <CardDescription>
            One Membership. One Community. <span className="font-bold text-primary block mt-1">Starting at ${MEMBERSHIP_FEE}.00 / Month</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="orgName" render={({ field }) => ( 
                    <FormItem> 
                        <FormLabel>Organization Name</FormLabel> 
                        <FormControl><Input placeholder="Acme Inc." {...field} disabled={isLoading} /></FormControl> 
                        <FormMessage /> 
                    </FormItem> 
                )} />
                <FormField control={form.control} name="name" render={({ field }) => ( 
                    <FormItem> 
                        <FormLabel>Your Name</FormLabel> 
                        <FormControl><Input placeholder="John Doe" {...field} disabled={isLoading} /></FormControl> 
                        <FormMessage /> 
                    </FormItem> 
                )} />
                <FormField control={form.control} name="email" render={({ field }) => ( 
                    <FormItem> 
                        <FormLabel>Work Email</FormLabel> 
                        <FormControl><Input placeholder="name@example.com" {...field} disabled={isLoading} /></FormControl> 
                        <FormMessage /> 
                    </FormItem> 
                )} />
                <FormField control={form.control} name="password" render={({ field }) => ( 
                    <FormItem> 
                        <FormLabel>Password</FormLabel> 
                        <FormControl><Input type="password" placeholder="••••••••" {...field} disabled={isLoading} /></FormControl> 
                        <FormMessage /> 
                    </FormItem> 
                )} />
                <p className="text-xs text-center text-muted-foreground pt-2">
                    By creating an account, you agree to our <Link href="/terms" target="_blank" className="underline">Terms of Service</Link>.
                </p>
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-center mb-4">
                    <p className="text-sm font-semibold text-primary">No tiers. No traps. Locked for life.</p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                        </>
                    ) : (
                        "Create Account"
                    )}
                </Button>
            </form>
        </Form>
      </CardContent>
       <CardFooter className="justify-center text-sm">
        <p>
            Already a member?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
            </Link>
        </p>
      </CardFooter>
    </>
  );
}
