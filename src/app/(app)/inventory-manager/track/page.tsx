
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { LoaderCircle, ArrowLeft, FilterX, ChevronsUpDown, Check, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInventoryItems, getInventoryLogs, type InventoryLog, type Item } from '@/services/inventory-service';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import type { DateRange } from 'react-day-picker';


export default function TrackInventoryPage() {
    const [logs, setLogs] = useState<InventoryLog[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string | 'all'>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);
    const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
    const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);


    const { user } = useAuth();
    const { toast } = useToast();
    
    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedLogs, fetchedItems] = await Promise.all([
                getInventoryLogs(user.uid),
                getInventoryItems(user.uid),
            ]);
            setLogs(fetchedLogs);
            setItems(fetchedItems);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const filteredLogs = useMemo(() => {
        return logs
            .filter(log => {
                if (selectedItemId && log.itemId !== selectedItemId) return false;
                if (selectedType !== 'all' && log.changeType !== selectedType) return false;
                if (dateRange?.from) {
                    const logDate = new Date(log.timestamp);
                    const from = startOfDay(dateRange.from);
                    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
                    if (logDate < from || logDate > to) {
                        return false;
                    }
                }
                return true;
            })
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [logs, selectedItemId, selectedType, dateRange]);
    
    const clearFilters = () => {
        setSelectedItemId(null);
        setSelectedType('all');
        setDateRange(undefined);
    };
    
    const changeTypeOptions = ['Initial Stock', 'Purchase', 'Sale', 'Adjustment'];

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="relative text-center">
                <div className="absolute left-0 top-1/2 -translate-y-1/2">
                    <Button asChild variant="outline">
                        <Link href="/inventory-manager">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Inventory Hub
                        </Link>
                    </Button>
                </div>
                <h1 className="text-3xl font-bold font-headline text-primary">Inventory Transaction Log</h1>
                <p className="text-muted-foreground">A complete audit trail of all inventory movements.</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter the log to find specific transactions.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                     <div className="space-y-2">
                        <Label>Item</Label>
                        <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-56 justify-between"><span className="truncate">{selectedItemId ? items.find(i => i.id === selectedItemId)?.name : "All Items"}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-0"><Command><CommandInput placeholder="Search items..." /><CommandList><CommandEmpty>No item found.</CommandEmpty><CommandGroup>{items.map(i => ( <CommandItem key={i.id} value={i.name} onSelect={() => { setSelectedItemId(i.id); setIsItemPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedItemId === i.id ? "opacity-100" : "opacity-0")}/>{i.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                        </Popover>
                     </div>
                     <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {changeTypeOptions.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-48 justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? format(dateRange.from, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <CustomCalendar mode="single" selected={dateRange?.from} onSelect={(date) => { setDateRange(prev => ({ ...prev, from: date })); setIsStartDatePickerOpen(false); }} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>End Date</Label>
                        <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-48 justify-start text-left font-normal", !dateRange?.to && "text-muted-foreground")} disabled={!dateRange?.from}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.to ? format(dateRange.to, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <CustomCalendar mode="single" selected={dateRange?.to} onSelect={(date) => { setDateRange(prev => ({ ...prev, to: date })); setIsEndDatePickerOpen(false); }} disabled={(date) => dateRange?.from ? date < dateRange.from : false} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <Button variant="ghost" onClick={clearFilters} disabled={!selectedItemId && selectedType === 'all' && !dateRange}><FilterX className="mr-2 h-4 w-4"/> Clear</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Log</CardTitle></CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <ScrollArea className="h-96">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Change</TableHead>
                                        <TableHead className="text-right">New Qty</TableHead>
                                        <TableHead>Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.length > 0 ? filteredLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{format(new Date(log.timestamp), 'PPpp')}</TableCell>
                                            <TableCell className="font-medium">{log.itemName}</TableCell>
                                            <TableCell><Badge variant="secondary">{log.changeType}</Badge></TableCell>
                                            <TableCell className={cn("text-right font-mono", log.quantityChange >= 0 ? 'text-green-600' : 'text-red-600')}>
                                                {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{log.newQuantity}</TableCell>
                                            <TableCell>{log.notes}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">No logs found for the selected filters.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    