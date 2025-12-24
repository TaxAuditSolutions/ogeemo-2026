

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import {
  ArrowRight,
  Calculator,
  LoaderCircle,
  Plus,
  Settings,
  Edit,
  FileDigit,
  ChevronsUpDown,
  Check,
  Calendar as CalendarIcon,
  FilterX,
} from 'lucide-react';
import { getActionChips as getQuickNavItems, type ActionChipData } from '@/services/project-service';
import accountingMenuItems from '@/data/accounting-menu-items';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getInvoices, type Invoice } from '@/services/accounting-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const EDIT_INVOICE_ID_KEY = 'editInvoiceId';


interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  cta: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, href, cta }) => (
  <Card className="flex flex-col">
    <CardHeader>
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex-1" />
    <CardFooter>
      <Button asChild className="w-full">
        <Link href={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </CardFooter>
  </Card>
);

export function AccountingToolsView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isClientPopoverOpen, setIsClientPopoverOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [fetchedInvoices, fetchedContacts] = await Promise.all([
            getInvoices(user.uid),
            getContacts(user.uid),
        ]);
        setInvoices(fetchedInvoices);
        setContacts(fetchedContacts);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load invoicing data.' });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(invoice => {
        const clientMatch = !selectedContactId || invoice.contactId === selectedContactId;
        const dateMatch = !dateRange?.from || (
          invoice.invoiceDate >= dateRange.from &&
          invoice.invoiceDate <= (dateRange.to || dateRange.from)
        );
        return clientMatch && dateMatch;
      })
      .sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime());
  }, [invoices, selectedContactId, dateRange]);
  
  const handleEditInvoice = (invoiceId: string) => {
    localStorage.setItem(EDIT_INVOICE_ID_KEY, invoiceId);
    router.push('/accounting/invoices/create');
  };

  const hubFeatureHrefs = [
    "/accounting/bks",
    "/accounting/accounts-payable",
    "/accounting/payroll",
    "/accounting/reports",
    "/accounting/tax",
  ];
  
  const hubFeatures = accountingMenuItems.filter(item => hubFeatureHrefs.includes(item.href));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="text-center mb-6">
        <div className="flex justify-center items-center gap-4 mb-2">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline text-primary">
              Accounting Hub
            </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Your central command for managing finances. Use the cards below to navigate to key areas.
        </p>
         <div className="mt-4">
            <Button asChild>
                <Link href="/accounting/manage-navigation">
                  <Settings className="mr-2 h-4 w-4"/>
                  Manage Quick Navigation
                </Link>
            </Button>
        </div>
      </header>
      
      <div className="space-y-8 max-w-7xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Invoicing</CardTitle>
              <CardDescription>Create invoices and review paid and unpaid invoices, selected by date range.</CardDescription>
            </div>
            <Button asChild>
              <Link href="/accounting/invoices/create"><Plus className="mr-2 h-4 w-4"/> Create Invoice</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <Popover open={isClientPopoverOpen} onOpenChange={setIsClientPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between">
                                {selectedContactId ? contacts.find(c => c.id === selectedContactId)?.name : 'Filter by client...'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                                <CommandInput placeholder="Search clients..." />
                                <CommandList>
                                    <CommandEmpty>No client found.</CommandEmpty>
                                    <CommandGroup>
                                        {contacts.map(c => <CommandItem key={c.id} value={c.name} onSelect={() => { setSelectedContactId(c.id); setIsClientPopoverOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", selectedContactId === c.id ? "opacity-100" : "opacity-0")} />{c.name}</CommandItem>)}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex-1 w-full">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Filter by date...</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                        </PopoverContent>
                    </Popover>
                </div>
                <Button variant="ghost" onClick={() => { setSelectedContactId(null); setDateRange(undefined); }}>
                    <FilterX className="mr-2 h-4 w-4" /> Clear Filters
                </Button>
            </div>
             {isLoading ? (
                <div className="flex justify-center items-center h-48"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredInvoices.length > 0 ? filteredInvoices.map(inv => (
                                <TableRow key={inv.id}>
                                    <TableCell>{inv.invoiceNumber}</TableCell>
                                    <TableCell>{inv.companyName}</TableCell>
                                    <TableCell>{format(inv.invoiceDate, 'PP')}</TableCell>
                                    <TableCell>{format(inv.dueDate, 'PP')}</TableCell>
                                    <TableCell>{inv.status}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(inv.originalAmount)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleEditInvoice(inv.id)}>
                                            <Edit className="mr-2 h-4 w-4"/> Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No invoices match your criteria.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hubFeatures.map((item) => (
            <FeatureCard 
              key={item.href}
              icon={item.icon}
              title={item.label}
              description={`Manage ${item.label.toLowerCase()}.`} // Generic description
              href={item.href}
              cta={`Go to ${item.label}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
