'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle, 
    CardFooter 
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    LoaderCircle, 
    Printer, 
    Calendar as CalendarIcon, 
    FilterX, 
    Clock, 
    Bot, 
    LayoutList,
    Users,
    User,
    Briefcase,
    Info,
    HelpCircle,
    ArrowRight
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { getContacts, type Contact } from '@/services/contact-service';
import { getTimeLogs, type TimeLog } from '@/services/timelog-service';
import { getTasksForUser } from '@/services/project-service';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { cn, formatTime, formatCurrency } from '@/lib/utils';
import { ReportsPageHeader } from '@/components/reports/page-header';
import { ContactSelector } from '@/components/contacts/contact-selector';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type CombinedActivity = {
    id: string;
    date: Date;
    subject: string;
    details: string;
    workerName: string;
    durationSeconds: number;
    isBillable: boolean;
    billableRate: number;
    source: 'Manual Log' | 'Command Centre' | 'Field App' | 'Ritual';
    type: 'Staff / Worker' | 'Ritual';
};

const MetricCard = ({ title, value, icon: Icon, colorClass }: { title: string; value: string; icon: React.ElementType; colorClass: string }) => (
    <Card className="bg-white border-primary/10">
        <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">{title}</p>
            <p className={cn("text-2xl font-bold font-mono", colorClass)}>{value}</p>
        </CardContent>
    </Card>
);

export function WorkActivityView() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { handlePrint, contentRef } = useReactToPrint();
    const searchParams = useSearchParams();
    
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
    const [tasks, setTasks] = useState<TaskEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedContactId, setSelectedContactId] = useState<string | null>(searchParams.get('contactId'));
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [showDetails, setShowDetails] = useState<boolean>(false);
    
    const [isStartOpen, setIsStartOpen] = useState(false);
    const [isEndOpen, setIsEndOpen] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [fetchedContacts, fetchedLogs, fetchedTasks] = await Promise.all([
                getContacts(),
                getTimeLogs(),
                getTasksForUser()
            ]);
            setContacts(fetchedContacts);
            setTimeLogs(fetchedLogs);
            setTasks(fetchedTasks);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Load Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => { loadData(); }, [loadData]);

    const activityData = useMemo(() => {
        if (!selectedContactId) return [];

        const filteredLogs = timeLogs.filter(l => l.contactId === selectedContactId);
        const filteredTasks = tasks.filter(t => t.contactId === selectedContactId && (t.duration || 0) > 0);

        const combined: CombinedActivity[] = [
            ...filteredLogs.map(l => ({
                id: l.id,
                date: new Date(l.startTime),
                subject: l.subject || 'Work Session',
                details: l.notes || '',
                workerName: l.workerName,
                durationSeconds: l.durationSeconds,
                isBillable: l.isBillable || false,
                billableRate: l.billableRate || 0,
                source: l.location ? 'Field App' : 'Manual Log' as any,
                type: 'Staff / Worker' as const
            })),
            ...filteredTasks.map(t => ({
                id: t.id,
                date: new Date(t.start || 0),
                subject: t.title,
                details: t.description || '',
                workerName: t.ritualType ? 'System Ritual' : 'Staff Member',
                durationSeconds: t.duration || 0,
                isBillable: t.isBillable || false,
                billableRate: t.billableRate || 0,
                source: t.ritualType ? 'Ritual' : 'Command Centre' as any,
                type: t.ritualType ? 'Ritual' : 'Staff / Worker' as const
            }))
        ];

        let final = combined;
        if (dateRange?.from) {
            const rangeEnd = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
            final = final.filter(a => isWithinInterval(a.date, { start: startOfDay(dateRange.from!), end: rangeEnd }));
        }

        return final.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [selectedContactId, timeLogs, tasks, dateRange]);

    const stats = useMemo(() => {
        const totalSeconds = activityData.reduce((sum, a) => sum + a.durationSeconds, 0);
        const billableSeconds = activityData.filter(a => a.isBillable).reduce((sum, a) => sum + a.durationSeconds, 0);
        const ritualSeconds = activityData.filter(a => a.type === 'Ritual').reduce((sum, a) => sum + a.durationSeconds, 0);
        const earned = activityData.filter(a => a.isBillable).reduce((sum, a) => sum + (a.durationSeconds / 3600) * (a.billableRate || 0), 0);

        return { totalSeconds, billableSeconds, ritualSeconds, earned };
    }, [activityData]);

    const selectedContact = contacts.find(c => c.id === selectedContactId);

    return (
        <div className="p-4 sm:p-6 space-y-6 text-black bg-muted/10 min-h-full">
            <ReportsPageHeader pageTitle="Work Activity Summary" />
            
            <header className="text-center space-y-2 print:hidden">
                <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Work Activity Summary</h1>
                <p className="text-muted-foreground text-lg">Consolidated evidence of work built on high-fidelity time logs.</p>
            </header>

            <div className="max-w-6xl mx-auto space-y-6">
                <Card className="print:hidden border-primary/20 shadow-lg">
                    <CardHeader className="bg-primary/5 border-b pb-4">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Report Detail & Range</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <Label className="font-bold flex items-center gap-2"><Users className="h-4 w-4" /> Select Client/Contact</Label>
                            <ContactSelector 
                                contacts={contacts} 
                                selectedContactId={selectedContactId} 
                                onSelectContact={setSelectedContactId} 
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="font-bold flex items-center gap-2"><Clock className="h-4 w-4" /> Date Range</Label>
                            <div className="flex gap-2">
                                <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="flex-1 justify-start text-xs font-normal">
                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                            {dateRange?.from ? format(dateRange.from, 'PP') : 'Start'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><CustomCalendar mode="single" selected={dateRange?.from} onSelect={d => { if(d) setDateRange(p => ({ from: d, to: p?.to })); setIsStartOpen(false); }} initialFocus /></PopoverContent>
                                </Popover>
                                <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="flex-1 justify-start text-xs font-normal" disabled={!dateRange?.from}>
                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                            {dateRange?.to ? format(dateRange.to, 'PP') : 'End'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><CustomCalendar mode="single" selected={dateRange?.to} onSelect={d => { if(d) setDateRange(p => ({ from: p?.from, to: d })); setIsEndOpen(false); }} disabled={d => dateRange?.from ? d < dateRange.from : false} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="font-bold flex items-center gap-2"><LayoutList className="h-4 w-4" /> Detail Level</Label>
                            <RadioGroup value={showDetails ? 'deep' : 'summary'} onValueChange={v => setShowDetails(v === 'deep')} className="flex gap-4 pt-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="summary" id="r-summary" />
                                    <Label htmlFor="r-summary" className="cursor-pointer">Summary Only</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="deep" id="r-deep" />
                                    <Label htmlFor="r-deep" className="cursor-pointer">Include Notes</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/10 border-t justify-between items-center py-3">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedContactId(null); setDateRange(undefined); }} disabled={!selectedContactId}>
                            <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                        </Button>
                        <Button size="sm" onClick={handlePrint} disabled={!selectedContactId}>
                            <Printer className="mr-2 h-4 w-4" /> Print Evidence PDF
                        </Button>
                    </CardFooter>
                </Card>

                {selectedContactId ? (
                    <div ref={contentRef} className="space-y-8 print:p-0">
                        <div className="hidden print:block text-center border-b pb-6 space-y-2">
                            <h1 className="text-3xl font-bold uppercase tracking-widest text-gray-800">Work Activity Report</h1>
                            <p className="text-gray-600 font-medium">Prepared for: {selectedContact?.businessName || selectedContact?.name}</p>
                            <p className="text-xs text-gray-400">Period: {dateRange?.from ? `${format(dateRange.from, 'PP')} - ${dateRange.to ? format(dateRange.to, 'PP') : 'Present'}` : 'Full History'}</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard title="Total Time" value={formatTime(stats.totalSeconds)} icon={Clock} colorClass="text-slate-900" />
                            <MetricCard title="Billable Time" value={formatTime(stats.billableSeconds)} icon={CheckCircle2} colorClass="text-green-600" />
                            <Card className="bg-white border-primary/10">
                                <CardContent className="p-4 text-center relative group">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="absolute top-2 right-2 cursor-help text-primary/40 group-hover:text-primary transition-colors">
                                                    <HelpCircle className="h-3 w-3" />
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs p-3">
                                                <p className="text-xs font-bold mb-1">Rituals (Automated)</p>
                                                <p className="text-[10px] leading-tight">These are system-generated sessions from your **Planning Rituals** (e.g., Daily Wind-down). They ensure your business remains focused and orchestrated.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest mb-1">Rituals (Automated)</p>
                                    <p className="text-2xl font-bold font-mono text-blue-600">{formatTime(stats.ritualSeconds)}</p>
                                </CardContent>
                            </Card>
                            <MetricCard title="Billable Total" value={formatCurrency(stats.earned)} icon={ArrowRight} colorClass="text-primary" />
                        </div>

                        <Card className="shadow-2xl print:shadow-none print:border-none">
                            <CardHeader className="bg-muted/30 border-b print:hidden">
                                <CardTitle>Work Activity Log</CardTitle>
                                <CardDescription>Consolidated timeline of operational work sessions.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow>
                                            <TableHead className="w-32">Date</TableHead>
                                            <TableHead>Task / Activity</TableHead>
                                            <TableHead className="text-center">Source</TableHead>
                                            <TableHead className="text-right">Duration</TableHead>
                                            <TableHead className="text-right">Billing</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activityData.length > 0 ? activityData.map((a) => (
                                            <React.Fragment key={a.id}>
                                                <TableRow className="group">
                                                    <TableCell className="text-xs font-medium text-muted-foreground">{format(a.date, 'yyyy-MM-dd')}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm">{a.subject}</span>
                                                                {a.type === 'Ritual' && <Bot className="h-3 w-3 text-blue-500" />}
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1 mt-0.5">
                                                                <User className="h-2.5 w-2.5" /> {a.workerName}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={cn("text-[9px] uppercase h-5 font-bold tracking-tighter", a.type === 'Ritual' ? "border-blue-200 text-blue-600 bg-blue-50" : "")}>
                                                            {a.source}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs">{formatTime(a.durationSeconds)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {a.isBillable ? (
                                                            <div className="flex flex-col items-end">
                                                                <Badge className="bg-green-100 text-green-800 border-green-200 h-5 text-[9px]">Billable</Badge>
                                                                <span className="text-[10px] font-mono font-bold mt-0.5">@{formatCurrency(a.billableRate)}/hr</span>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="secondary" className="h-5 text-[9px] opacity-50">Non-Billable</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                                {showDetails && a.details && (
                                                    <TableRow className="bg-primary/5 hover:bg-primary/5">
                                                        <TableCell />
                                                        <TableCell colSpan={4} className="py-3 pr-8">
                                                            <div className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4">
                                                                {a.details}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                                    No activity recorded for this period.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                    <TableFooter className="bg-muted/30">
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-right font-bold uppercase text-[10px] tracking-widest">Total Billable Amount</TableCell>
                                            <TableCell className="text-right font-bold font-mono text-primary" colSpan={2}>{formatCurrency(stats.earned)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </CardContent>
                            <CardFooter className="bg-muted/5 p-4 border-t justify-center text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em]">
                                Evidence Verification Protocol: Ogeemo Verified
                            </CardFooter>
                        </Card>
                    </div>
                ) : (
                    <div className="py-20 text-center space-y-6">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                            <Briefcase className="h-10 w-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold font-headline">Select a Client Node</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">Choose a contact to assemble their work activity evidence from the Spider Web.</p>
                        </div>
                        <ContactSelector 
                            contacts={contacts} 
                            selectedContactId={selectedContactId} 
                            onSelectContact={setSelectedContactId} 
                            className="w-64"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
