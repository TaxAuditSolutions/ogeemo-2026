
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getEmployees, type Employee } from '@/services/payroll-service';
import { addTask } from '@/services/project-service';
import { LoaderCircle, Clock, User, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, set } from 'date-fns';
import { ChevronsUpDown, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const emptyLog = {
    employeeId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: { hour: '9', minute: '0' },
    endTime: { hour: '17', minute: '0' },
    description: '',
};

export default function LogEmployeeTimePage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newLog, setNewLog] = useState(emptyLog);
    const [isSaving, setIsSaving] = useState(false);
    const [isEmployeePopoverOpen, setIsEmployeePopoverOpen] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();

    const loadEmployees = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const fetchedEmployees = await getEmployees(user.uid);
            setEmployees(fetchedEmployees);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load employees', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const handleSaveLog = async () => {
        if (!user || !newLog.employeeId || !newLog.date) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select an employee and a date.' });
            return;
        }

        setIsSaving(true);
        try {
            const logDate = new Date(newLog.date);
            const startTime = set(logDate, { hours: parseInt(newLog.startTime.hour), minutes: parseInt(newLog.startTime.minute) });
            const endTime = set(logDate, { hours: parseInt(newLog.endTime.hour), minutes: parseInt(newLog.endTime.minute) });

            if (endTime <= startTime) {
                toast({ variant: 'destructive', title: 'Invalid Times', description: 'End time must be after start time.' });
                setIsSaving(false);
                return;
            }

            const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
            
            const taskData = {
                title: `Time Log: ${employees.find(e => e.id === newLog.employeeId)?.name}`,
                description: newLog.description,
                start: startTime,
                end: endTime,
                duration: durationSeconds,
                workerId: newLog.employeeId,
                userId: user.uid,
                status: 'done' as const,
                isBillable: false,
                position: 0,
            };

            await addTask(taskData);
            
            toast({ title: "Time Logged", description: `Time entry for the selected employee has been saved.` });
            setNewLog(emptyLog);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const hourOptions = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: format(set(new Date(), { hours: i }), 'h a') }));
    const minuteOptions = Array.from({ length: 12 }, (_, i) => { const minutes = i * 5; return { value: String(minutes), label: `:${minutes.toString().padStart(2, '0')}` }; });


    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="p-4 sm:p-6 flex flex-col items-center h-full">
            <header className="text-center mb-6">
                <h1 className="text-3xl font-bold font-headline text-primary">Log Employee Time</h1>
                <p className="text-muted-foreground">Log hours for an employee or contractor for payroll.</p>
            </header>
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>New Time Card Entry</CardTitle>
                    <CardDescription>This will create a time entry that can be used to calculate gross pay during a payroll run.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Employee / Contractor</Label>
                        <Popover open={isEmployeePopoverOpen} onOpenChange={setIsEmployeePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {newLog.employeeId ? employees.find(e => e.id === newLog.employeeId)?.name : "Select a worker..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search workers..." />
                                    <CommandList>
                                        <CommandEmpty>No worker found.</CommandEmpty>
                                        <CommandGroup>
                                            {employees.map(emp => (
                                                <CommandItem key={emp.id} value={emp.name} onSelect={() => { setNewLog(p => ({ ...p, employeeId: emp.id })); setIsEmployeePopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", newLog.employeeId === emp.id ? "opacity-100" : "opacity-0")} />
                                                    {emp.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="log-date">Date Worked</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !newLog.date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {newLog.date ? format(new Date(newLog.date), "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newLog.date ? new Date(newLog.date) : undefined} onSelect={(date) => date && setNewLog(p => ({ ...p, date: format(date, 'yyyy-MM-dd') }))} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <div className="flex gap-2">
                                <Select value={newLog.startTime.hour} onValueChange={(v) => setNewLog(p => ({...p, startTime: {...p.startTime, hour: v}}))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                </Select>
                                 <Select value={newLog.startTime.minute} onValueChange={(v) => setNewLog(p => ({...p, startTime: {...p.startTime, minute: v}}))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <div className="flex gap-2">
                                <Select value={newLog.endTime.hour} onValueChange={(v) => setNewLog(p => ({...p, endTime: {...p.endTime, hour: v}}))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{hourOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                </Select>
                                 <Select value={newLog.endTime.minute} onValueChange={(v) => setNewLog(p => ({...p, endTime: {...p.endTime, minute: v}}))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{minuteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="log-description">Description (Optional)</Label>
                        <Input id="log-description" placeholder="e.g., Regular shift, work on Project X" value={newLog.description} onChange={(e) => setNewLog(p => ({ ...p, description: e.target.value }))} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveLog} disabled={isSaving} className="w-full">
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Log Time
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
