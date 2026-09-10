"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FirebaseError } from "firebase/app";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { CheckCircle2, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { passwordConfirmationSchema, STRONG_PASSWORD_HELP_TEXT } from "@/lib/password-policy";

type ResetState = "loading" | "ready" | "invalid" | "success" | "unavailable";
type ResetPasswordValues = z.infer<typeof passwordConfirmationSchema>;

export function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const { auth, isLoading: isAuthLoading } = useAuth();
    const [state, setState] = useState<ResetState>("loading");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const mode = searchParams.get("mode");
    const actionCode = searchParams.get("oobCode");
    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(passwordConfirmationSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    useEffect(() => {
        if (mode !== "resetPassword" || !actionCode) {
            setState("invalid");
            return;
        }
        if (!auth) {
            if (!isAuthLoading) {
                setState("unavailable");
            }
            return;
        }

        let isCurrent = true;
        setState("loading");
        verifyPasswordResetCode(auth, actionCode)
            .then(() => {
                if (isCurrent) setState("ready");
            })
            .catch(() => {
                if (isCurrent) setState("invalid");
            });

        return () => {
            isCurrent = false;
        };
    }, [actionCode, auth, isAuthLoading, mode]);

    async function onSubmit(values: ResetPasswordValues) {
        if (!auth || !actionCode) {
            setState("invalid");
            return;
        }

        setIsSubmitting(true);
        setSubmissionError(null);
        try {
            await confirmPasswordReset(auth, actionCode, values.password);
            form.reset();
            setState("success");
        } catch (error) {
            if (
                error instanceof FirebaseError &&
                (error.code === "auth/expired-action-code" || error.code === "auth/invalid-action-code")
            ) {
                setState("invalid");
            } else if (error instanceof FirebaseError && error.code === "auth/weak-password") {
                form.setError("password", { message: "The password does not meet the required strength policy." });
            } else {
                setSubmissionError("We could not update your password. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    if (state === "loading") {
        return (
            <CardContent className="flex min-h-48 items-center justify-center" role="status">
                <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="sr-only">Verifying password reset link</span>
            </CardContent>
        );
    }

    if (state === "invalid") {
        return (
            <>
                <CardHeader>
                    <CardTitle>Password Reset Link Expired</CardTitle>
                    <CardDescription>
                        This link has expired or has already been used. Return to login and use Forgot Your Password? to request a new link.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/login">Return to Login</Link>
                    </Button>
                </CardFooter>
            </>
        );
    }

    if (state === "unavailable") {
        return (
            <>
                <CardHeader>
                    <CardTitle>Password Reset Unavailable</CardTitle>
                    <CardDescription>Password reset is temporarily unavailable. Please try again later.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/login">Return to Login</Link>
                    </Button>
                </CardFooter>
            </>
        );
    }

    if (state === "success") {
        return (
            <>
                <CardHeader className="items-center text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden="true" />
                    <CardTitle>Password Updated</CardTitle>
                    <CardDescription>Your password has been updated successfully. You can now sign in with your new password.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/login">Go to Login</Link>
                    </Button>
                </CardFooter>
            </>
        );
    }

    return (
        <>
            <CardHeader>
                <CardTitle>Reset Your Password</CardTitle>
                <CardDescription>{STRONG_PASSWORD_HELP_TEXT}</CardDescription>
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
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="new-password"
                                                disabled={isSubmitting}
                                                className="pr-10"
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                                onClick={() => setShowPassword((visible) => !visible)}
                                                aria-label={showPassword ? "Hide new password" : "Show new password"}
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
                                    <FormLabel>Confirm New Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmation ? "text" : "password"}
                                                autoComplete="new-password"
                                                disabled={isSubmitting}
                                                className="pr-10"
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                                onClick={() => setShowConfirmation((visible) => !visible)}
                                                aria-label={showConfirmation ? "Hide password confirmation" : "Show password confirmation"}
                                            >
                                                {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
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
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </>
    );
}