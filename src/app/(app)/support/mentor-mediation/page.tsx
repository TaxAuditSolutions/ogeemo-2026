
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    ShieldAlert, 
    ArrowLeft, 
    LoaderCircle, 
    CheckCircle, 
    X, 
    Info, 
    User,
    Users,
    Scale
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { submitMentorReview } from '@/services/mentor-service';
import { getUsers, type UserProfile } from '@/services/user-profile-service';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from '@/lib/utils';

export default function MentorMediationPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [mentors, setMentors] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
    const [dispute, setDispute] = useState('');
    const [isMentorPopoverOpen, setIsWorkerPopoverOpen] = useState(false);

    useEffect(() => {
        async function loadMentors() {
            if (!user) return;
            try {
                const allUsers = await getUsers();
                // Find users with Mentor roles
                setMentors(allUsers.filter(u => u.role === 'Certified_Mentor' || u.role === 'Mentor_Apprentice'));
            } catch (e) {}
            finally { setIsLoading(false); }
        }
        loadMentors();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedMentorId || !dispute.trim()) {
            toast({ variant: 'destructive', title: 'Information Required', description: 'Please select a mentor and describe the dispute.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await submitMentorReview({
                requester_id: user.uid,
                target_mentor_id: selectedMentorId,
                dispute_description: dispute.trim(),
            });
            setIsSuccess(true);
            toast({ title: 'Mediation Recorded', description: 'The Lead Mentor Team has been notified.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;

    const selectedMentor = mentors.find(m => m.id === selectedMentorId);

    return (
        <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center bg-muted/10 min-h-full text-black">
            <header className="text-center relative w-full max-w-2xl">
                <div className="flex items-center justify-center gap-3">
                    <Scale className="h-10 w-10 text-primary" />
                    <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Mentor Mediation</h1>
                </div>
                <p className="text-muted-foreground mt-2">KISS Protocol for Collective Accountability.</p>
                <div className="absolute top-0 left-0">
                    <Button variant="outline" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                </div>
            </header>

            <Card className="w-full max-w-2xl shadow-xl border-primary/10">
                {isSuccess ? (
                    <CardContent className="py-16 flex flex-col items-center text-center space-y-6">
                        <div className="bg-green-100 p-4 rounded-full">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Signal Logged.</h2>
                            <p className="text-muted-foreground max-w-xs">Your request for mediation has been sent to Dan White and the Lead Mentor Team.</p>
                        </div>
                        <Button onClick={() => router.push('/welcome')}>Return to Dashboard</Button>
                    </CardContent>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <CardHeader className="bg-primary/5 border-b">
                            <CardTitle>Open a Mediation Request</CardTitle>
                            <CardDescription>Use this form if you have a professional dispute or feel misled by a mentor's guidance.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-primary">1. Identify the Mentor</Label>
                                <Popover open={isMentorPopoverOpen} onOpenChange={setIsWorkerPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between h-12 text-base">
                                            <span className="truncate">{selectedMentor ? selectedMentor.displayName : "Select from Mentor Team..."}</span>
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search mentors..." />
                                            <CommandList>
                                                <CommandEmpty>No mentors found in the circle.</CommandEmpty>
                                                <CommandGroup>
                                                    {mentors.map(m => (
                                                        <CommandItem key={m.id} onSelect={() => { setSelectedMentorId(m.id); setIsWorkerPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", selectedMentorId === m.id ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{m.displayName}</span>
                                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">{m.role?.replace('_', ' ')}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dispute" className="text-xs font-bold uppercase tracking-widest text-primary">2. Describe the Situation</Label>
                                <Textarea 
                                    id="dispute" 
                                    placeholder="Please provide high-fidelity details regarding the dispute or guidance in question..." 
                                    rows={8}
                                    value={dispute}
                                    onChange={e => setDispute(e.target.value)}
                                    className="resize-none text-base leading-relaxed"
                                />
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-muted/30 border rounded-xl">
                                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    The Ogeemo Mandate requires radical transparency. Your identity and this description will be shared directly with the Lead Team for resolution.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-muted/10 border-t p-6">
                            <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-xl font-bold shadow-2xl">
                                {isSubmitting ? <LoaderCircle className="mr-2 h-6 w-6 animate-spin" /> : <ShieldAlert className="mr-2 h-6 w-6" />}
                                Request Mediation
                            </Button>
                        </CardFooter>
                    </form>
                )}
            </Card>
        </div>
    );
}
