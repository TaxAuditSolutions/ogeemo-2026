"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";

const forgotPasswordSchema = z.object({
    email: z.string().trim().email("Please enter a valid email address."),
});

const confirmationMessage =
    "If this email address exists in our system, you will receive an email with instructions for how to reset your password";

interface ForgotPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialEmail?: string;
}

export function ForgotPasswordDialog({ open, onOpenChange, initialEmail = "" }: ForgotPasswordDialogProps) {
    const { auth } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const form = useForm<z.infer<typeof forgotPasswordSchema>>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: initialEmail },
    });

    useEffect(() => {
        if (open) {
            form.reset({ email: initialEmail });
            setIsSubmitted(false);
            setSubmissionError(null);
        }
    }, [form, initialEmail, open]);

    async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
        if (!auth) {
            setSubmissionError("Password reset is temporarily unavailable. Please try again.");
            return;
        }

        setIsSubmitting(true);
        setSubmissionError(null);
        try {
            await sendPasswordResetEmail(auth, values.email.trim());
            setIsSubmitted(true);
        } catch (error) {
            if (error instanceof FirebaseError && error.code === "auth/user-not-found") {
                setIsSubmitted(true);
            } else {
                setSubmissionError("We could not process your request right now. Please try again later.");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Forgot Your Password?</DialogTitle>
                    <DialogDescription>
                        Enter the email address associated with your account. If it is found, we will email you instructions for resetting your password.
                    </DialogDescription>
                </DialogHeader>

                {isSubmitted ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground" role="status">
                            {confirmationMessage}
                        </p>
                        <DialogFooter>
                            <Button type="button" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email address</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                autoComplete="email"
                                                placeholder="name@example.com"
                                                disabled={isSubmitting}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {submissionError && (
                                <p className="text-sm font-medium text-destructive" role="alert">
                                    {submissionError}
                                </p>
                            )}
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    Send Reset Instructions
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}