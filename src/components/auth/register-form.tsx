
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';

import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';

const registerSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export function RegisterForm() {
  const { auth } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    if (!auth) {
        toast({
            variant: 'destructive',
            title: 'Registration Failed',
            description: 'Authentication service not available. Please try again later.'
        });
        return;
    }
    
    try {
      await createUserWithEmailAndPassword(auth, values.email, values.password);
      // The AuthProvider will handle the redirect on successful registration
    } catch (error: any) {
      let description = "An unknown error occurred. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email is already associated with an account.";
      }
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description,
      });
    }
  }

  // This component's UI is now rendered directly within the register page.
  // The logic remains here but the JSX is removed to avoid duplication.
  return null;
}
