"use client";

import { useState } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import LoadingModal from "@/components/ui/loading-modal";
import { Logo } from "@/components/logo";
import { useFirebase } from "@/firebase";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

function GoogleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 mr-2">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.618-3.229-11.303-7.582l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.447-2.274 4.481-4.244 5.892l6.19 5.238C42.012 35.245 44 30.028 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
    )
}

export default function LoginPage() {
  const { toast } = useToast();
  const { signInWithGoogle } = useAuth(); // Get services from context
  const { services } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function handleEmailSignIn(values: z.infer<typeof loginSchema>): Promise<void> {
    if (!services?.auth) {
        toast({ variant: "destructive", title: "Login Failed", description: "Firebase is not ready. Please try again in a moment." });
        return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(services.auth, values.email, values.password);
      // On successful sign-in, the AuthProvider will handle session creation and redirect.
      // The loading modal will stay until the redirect happens.
    } catch (error: any) {
      let description = "An unknown error occurred. Please try again.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        description = "Invalid email or password. Please check your credentials and try again.";
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: description,
      });
      setIsLoading(false); // Hide modal on error
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // On successful sign-in, the AuthProvider will handle the redirect and token storage.
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      let description = `An unknown error occurred. (Code: ${error.code})`;
      if (error.code === 'auth/popup-closed-by-user') {
        description = "Sign-in was cancelled. Please try again.";
      } else if (error.code === 'auth/unauthorized-domain') {
          description = `This domain is not authorized. Please add it to your Firebase console's authentication settings.`;
      }
      toast({
        variant: "destructive",
        title: "Google Sign-In Failed",
        description: description,
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <LoadingModal message="Signing in..." />}
      <CardHeader className="flex flex-col items-center gap-4 text-center">
        <Logo />
        <div className="flex flex-col">
            <CardTitle className="text-2xl font-body font-bold text-[#3B2F4A]">Welcome Back</CardTitle>
            <CardDescription>Sign in to your Ogeemo account.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleEmailSignIn)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} disabled={isLoading} />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-xs text-center text-muted-foreground pt-1">
              By signing in, you agree to our <Link href="/terms" target="_blank" className="underline">Terms of Service</Link>.
            </p>
            <Button type="submit" className="w-full" disabled={isLoading}>
              Sign In
            </Button>
          </form>
        </Form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
            <GoogleIcon />
            Sign in with Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <p>
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline" tabIndex={isLoading ? -1 : undefined}>
                Sign up
            </Link>
        </p>
      </CardFooter>
    </>
  );
}
