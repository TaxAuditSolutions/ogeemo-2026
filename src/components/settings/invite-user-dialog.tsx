'use client';

import React, { useState } from 'react';
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { inviteUser } from '@/app/actions/org-actions';
import { LoaderCircle, MailPlus, Send } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AccessLevel, UserProfile } from '@/core/user-profile-service';

const inviteSchema = z.object({
    email: z.string().email({ message: 'A valid email is required.' }),
    role: z.enum(['org_admin', 'editor', 'viewer']).default('viewer'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onUserInvited: () => void;
    currentUserProfile: UserProfile | null;
}

export function InviteUserDialog({ isOpen, onOpenChange, onUserInvited, currentUserProfile }: InviteUserDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const formMethods = useForm<InviteFormData>({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            email: '',
            role: 'viewer',
        },
    });

    const { reset, handleSubmit } = formMethods;

    // Reset form when opened
    React.useEffect(() => {
        if (isOpen) {
            reset({ email: '', role: 'viewer' });
        }
    }, [isOpen, reset]);

    const onSubmit = async (values: InviteFormData) => {
        if (!currentUserProfile?.orgId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Your organization ID is missing.' });
            return;
        }

        setIsSaving(true);
        try {
            const result = await inviteUser({
                invitedEmail: values.email,
                targetRole: values.role as AccessLevel,
                orgId: currentUserProfile.orgId,
            });

            if (result.success) {
                toast({ title: 'Invitation Sent', description: `An invitation has been sent to ${values.email}.` });
                onUserInvited();
                onOpenChange(false);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to Invite', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const isOrgAdmin = currentUserProfile?.accessLevel === 'org_admin';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><MailPlus className="h-5 w-5 text-primary" /> Invite Team Member</DialogTitle>
                    <DialogDescription>
                        Send an invitation to join your organization.
                    </DialogDescription>
                </DialogHeader>

                <Form {...formMethods}>
                    <form id="invite-user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4" autoComplete="off">
                        <FormField control={formMethods.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="colleague@company.com" {...field} autoComplete="off" disabled={isSaving} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={formMethods.control} name="role" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Authority Level</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isSaving}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {isOrgAdmin && <SelectItem value="org_admin">Admin (Full Access)</SelectItem>}
                                        {isOrgAdmin && <SelectItem value="editor">Editor (Read/Edit)</SelectItem>}
                                        <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </form>
                </Form>

                <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button type="submit" form="invite-user-form" disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send Invite
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
