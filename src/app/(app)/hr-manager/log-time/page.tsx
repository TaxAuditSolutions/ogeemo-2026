
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
import { format } from 'date-fns';
import { ChevronsUpDown, Check } from 'lucide-react';

const emptyLog = {
    employeeId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
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
        if (!user || !newLog.employeeId || !newLog.date || !newLog.hours) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select an employee and enter the date and hours worked.' });
            return;
        }
        
        setIsSaving(true);
        try {
            const durationSeconds = parseFloat(newLog.hours) * 3600;
            const logDate = new Date(newLog.date);
            
            const taskData = {
                title: `Time Log: ${employees.find(e => e.id === newLog.employeeId)?.name}`,
                description: newLog.description,
                start: logDate,
                duration: durationSeconds,
                workerId: newLog.employeeId,
                userId: user.uid,
                status: 'done' as const,
                isBillable: false, // Payroll time is not client-billable
                position: 0,
            };

            await addTask(taskData);
            
            toast({ title: "Time Logged", description: `${newLog.hours} hours logged for the selected employee.` });
            setNewLog(emptyLog);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

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
                    <CardTitle>New Time Log</CardTitle>
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
                    <div className="grid grid-cols-2 gap-4">
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
                        <div className="space-y-2">
                            <Label htmlFor="hours-worked">Hours Worked</Label>
                            <Input id="hours-worked" type="number" placeholder="e.g., 8" value={newLog.hours} onChange={(e) => setNewLog(p => ({ ...p, hours: e.target.value }))} />
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
