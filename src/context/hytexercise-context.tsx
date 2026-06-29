'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { OctagonAlert } from 'lucide-react';

export interface StoredState {
    isActive: boolean;
    breakDueTimestamp: number;
    breakFrequency: number;
    breakDuration: number;
}

interface HytexerciseContextType {
    isActive: boolean;
    breakFrequency: number;
    breakDuration: number;
    timeLeft: number;
    isBreakAlertOpen: boolean;
    setIsBreakAlertOpen: (open: boolean) => void;
    setIsActive: (active: boolean) => void;
    setBreakFrequency: (freq: number) => void;
    setBreakDuration: (dur: number) => void;
    handleSaveSettings: () => void;
    handleStartBreak: () => void;
    handleDelayBreak: (minutes: number) => void;
    handleCancelBreak: () => void;
}

const HytexerciseContext = createContext<HytexerciseContextType | undefined>(undefined);

export const HYTEXERCISE_STORAGE_KEY = 'hytexerciseState';

export function HytexerciseProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [breakFrequency, setBreakFrequency] = useState(60);
    const [breakDuration, setBreakDuration] = useState(5);
    const [timeLeft, setTimeLeft] = useState(breakFrequency * 60);
    const [isBreakAlertOpen, setIsBreakAlertOpen] = useState(false);
    const [customDelay, setCustomDelay] = useState(5);

    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    const setTimer = useCallback((minutes: number) => {
        const dueTimestamp = Date.now() + minutes * 60 * 1000;
        const stateToStore: StoredState = {
            isActive: true,
            breakDueTimestamp: dueTimestamp,
            breakFrequency,
            breakDuration,
        };
        localStorage.setItem(HYTEXERCISE_STORAGE_KEY, JSON.stringify(stateToStore));
        setTimeLeft(minutes * 60);
    }, [breakFrequency, breakDuration]);

    useEffect(() => {
        try {
            const savedStateRaw = localStorage.getItem(HYTEXERCISE_STORAGE_KEY);
            if (savedStateRaw) {
                const savedState: StoredState = JSON.parse(savedStateRaw);
                setIsActive(savedState.isActive);
                setBreakFrequency(savedState.breakFrequency);
                setBreakDuration(savedState.breakDuration);

                if (savedState.isActive) {
                    const remainingSeconds = Math.round((savedState.breakDueTimestamp - Date.now()) / 1000);
                    if (remainingSeconds <= 0) {
                        // Avoid popping the alert if they are already on the player page
                        if (pathname !== '/hytexercise' && !location.search.includes('startBreak=true')) {
                            setIsBreakAlertOpen(true);
                        }
                        setTimeLeft(0);
                    } else {
                        setTimeLeft(remainingSeconds);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load Hytexercise state:", error);
            localStorage.removeItem(HYTEXERCISE_STORAGE_KEY);
        }
    }, [pathname]);

    useEffect(() => {
        if (!isActive || isBreakAlertOpen) {
            return;
        }

        // If they are on the hytexercise page actively doing a break, don't count down the next break yet
        if (pathname === '/hytexercise' && location.search.includes('startBreak=true')) {
             return;
        }

        if (timeLeft <= 0) {
            setIsBreakAlertOpen(true);
            return;
        }

        const intervalId = setInterval(() => {
            setTimeLeft((prevTime) => prevTime - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [isActive, timeLeft, isBreakAlertOpen, pathname]);

    useEffect(() => {
        if (isActive) {
            const savedStateRaw = localStorage.getItem(HYTEXERCISE_STORAGE_KEY);
            if (!savedStateRaw) {
                setTimer(breakFrequency);
            }
        } else {
            localStorage.removeItem(HYTEXERCISE_STORAGE_KEY);
        }
    }, [isActive, breakFrequency, setTimer]);

    const handleSaveSettings = () => {
        toast({
            title: "Settings Saved",
            description: "Your Hytexercise preferences have been updated.",
        });
        if (isActive) {
            setTimer(breakFrequency);
        } else {
            setTimeLeft(breakFrequency * 60);
        }
    };
    
    const handleStartBreak = () => {
        setIsBreakAlertOpen(false);
        localStorage.removeItem(HYTEXERCISE_STORAGE_KEY); // Temporarily remove so it doesn't trigger again
        router.push('/hytexercise?startBreak=true');
    };
    
    const handleDelayBreak = (delayMinutes: number) => {
        toast({
            title: "Break Delayed",
            description: `Your break has been delayed by ${delayMinutes} minutes.`,
        });
        setIsBreakAlertOpen(false);
        setTimer(delayMinutes);
    }
    
    const handleCancelBreak = () => {
        toast({
            title: "Break Skipped",
            description: `Your next break reminder is scheduled in ${breakFrequency} minutes.`,
        });
        setIsBreakAlertOpen(false);
        setTimer(breakFrequency);
    };

    return (
        <HytexerciseContext.Provider value={{
            isActive,
            breakFrequency,
            breakDuration,
            timeLeft,
            isBreakAlertOpen,
            setIsBreakAlertOpen,
            setIsActive,
            setBreakFrequency,
            setBreakDuration,
            handleSaveSettings,
            handleStartBreak,
            handleDelayBreak,
            handleCancelBreak
        }}>
            {children}
            
            <AlertDialog open={isBreakAlertOpen} onOpenChange={setIsBreakAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-3 text-2xl">
                            <OctagonAlert className="h-8 w-8 text-destructive" />
                            Time for a break!
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            It's time for your scheduled {breakDuration}-minute exercise break. Take a moment to stretch and recharge.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="delay-select">Or, delay your break by:</Label>
                        <Select
                            defaultValue={String(customDelay)}
                            onValueChange={(value) => setCustomDelay(Number(value))}
                        >
                            <SelectTrigger id="delay-select">
                                <SelectValue placeholder="Select delay time" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5 minutes</SelectItem>
                                <SelectItem value="10">10 minutes</SelectItem>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="20">20 minutes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter className="sm:justify-between">
                        <Button variant="ghost" onClick={handleCancelBreak}>Cancel Break</Button>
                        <div className="flex flex-col-reverse sm:flex-row sm:gap-2">
                            <Button variant="outline" onClick={() => handleDelayBreak(customDelay)}>Delay Break</Button>
                            <AlertDialogAction onClick={handleStartBreak}>Start Break Now</AlertDialogAction>
                        </div>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </HytexerciseContext.Provider>
    );
}

export function useHytexercise() {
    const context = useContext(HytexerciseContext);
    if (context === undefined) {
        throw new Error('useHytexercise must be used within a HytexerciseProvider');
    }
    return context;
}
