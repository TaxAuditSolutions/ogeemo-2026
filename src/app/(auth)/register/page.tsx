"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { UserPlus, Loader2, Sparkles, Eye, EyeOff } from 'lucide-react';

import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { registerOrganization } from '@/app/actions/org-actions';

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
    const [showPassword, setShowPassword] = useState(false);

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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <CardHeader className="text-center p-8 pb-4">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 rotate-3 hover:rotate-0 transition-transform">
                    <UserPlus className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-4xl font-headline font-bold tracking-tighter">Enter the Circle.</CardTitle>
                <CardDescription className="text-lg mt-2">
                    Professional Orchestration for the Modern Visionary.
                </CardDescription>

                <div className="mt-6 flex items-center justify-center gap-2">
                    <div className="h-px w-8 bg-border" />
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <Sparkles className="h-3 w-3" />
                        Founders Phase Active
                    </div>
                    <div className="h-px w-8 bg-border" />
                </div>
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
                                <FormControl>
                                    <div className="relative">
                                        <Input 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="••••••••" 
                                            {...field} 
                                            disabled={isLoading} 
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </FormControl>
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

            <CardFooter className="justify-center text-sm p-8 pt-0">
                <p className="text-muted-foreground">
                    Already have a key?{' '}
                    <Link href="/login" className="font-bold text-primary hover:underline">
                        Sign in to your dashboard
                    </Link>
                </p>
            </CardFooter>
        </div>
    );
}
