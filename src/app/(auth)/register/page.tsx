
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { UserPlus, Sparkles, ShieldCheck } from 'lucide-react';

import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { TermsDialog } from '@/components/auth/terms-dialog';
import { updateUserProfile } from '@/core/user-profile-service';
import { incrementUserCounter } from '@/core/system-service';
import { createOrganization } from '@/core/organization-service';
import { MembershipSignupForm, type SignupFormData } from '@/components/auth/membership-signup-form';

export default function RegisterPage() {
  const { toast } = useToast();
  const { auth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<SignupFormData | null>(null);

  const handleInitialSubmit = (values: SignupFormData) => {
    setFormData(values);
    setIsTermsDialogOpen(true);
  };

  const handleFinalSubmit = async () => {
    if (!formData || !auth) return;
    
    setIsLoading(true);
    try {
        // 1. Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        if (!user) throw new Error("User creation failed.");
        await updateProfile(user, { displayName: formData.name });
        
        // 2. Global System Logic (Founders Tracking)
        const { isFounder, count } = await incrementUserCounter();
        
        // 3. Organization Provisioning (Seat Tracking)
        const org = await createOrganization(user.uid, formData.businessName, formData.seatCount);

        // 4. Unified Profile Provisioning
        await updateUserProfile(user.uid, formData.email, {
            displayName: formData.name,
            role: 'Member', 
            companyName: formData.businessName,
            is_founder: isFounder,
            organizationId: org.id,
            price_lock_status: true,
        });

        toast({
            title: isFounder ? "Welcome, Founder!" : "Welcome to the Circle!",
            description: isFounder 
                ? `You are member #${count} of the first 500. Legacy status locked.`
                : `Your account and organization "${formData.businessName}" are ready.`,
        });
        
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
      
      <CardContent className="p-8 pt-4">
        <MembershipSignupForm onSubmit={handleInitialSubmit} isLoading={isLoading} />
      </CardContent>

       <CardFooter className="justify-center text-sm p-8 pt-0">
        <p className="text-muted-foreground">
            Already have a key?{' '}
            <Link href="/login" className="font-bold text-primary hover:underline">
                Sign in to your dashboard
            </Link>
        </p>
      </CardFooter>

      <TermsDialog
        isOpen={isTermsDialogOpen}
        onOpenChange={setIsTermsDialogOpen}
        onConfirm={handleFinalSubmit}
        isSubmitting={isLoading}
      />
    </div>
  );
}
