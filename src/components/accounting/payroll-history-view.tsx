
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MoreVertical, FileText, Download, Eye, User, ArrowLeft } from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type PayrollRun = {
  id: string;
  payPeriod: { from: Date; to: Date };
  payDate: Date;
  totalPayroll: number;
  employeesPaid: number;
  details: { employeeName: string; grossPay: number; deductions: number; netPay: number }[];
};

const dummyHistory: PayrollRun[] = [
  {
    id: 'run-1',
    payPeriod: { from: new Date('2024-07-01'), to: new Date('2024-07-15') },
    payDate: new Date('2024-07-20'),
    totalPayroll: 12540.75,
    employeesPaid: 3,
    details: [
        { employeeName: 'Alice Johnson', grossPay: 3125.00, deductions: 625.00, netPay: 2500.00 },
        { employeeName: 'Bob Williams', grossPay: 1275.00, deductions: 255.00, netPay: 1020.00 },
        { employeeName: 'Charlie Brown', grossPay: 1100.00, deductions: 220.00, netPay: 880.00 },
    ],
  },
  {
    id: 'run-2',
    payPeriod: { from: new Date('2024-06-16'), to: new Date('2024-06-30') },
    payDate: new Date('2024-07-05'),
    totalPayroll: 12495.50,
    employeesPaid: 3,
     details: [
        { employeeName: 'Alice Johnson', grossPay: 3125.00, deductions: 625.00, netPay: 2500.00 },
        { employeeName: 'Bob Williams', grossPay: 1243.75, deductions: 248.75, netPay: 995.00 },
        { employeeName: 'Charlie Brown', grossPay: 1062.50, deductions: 212.50, netPay: 850.00 },
    ],
  },
  {
    id: 'run-3',
    payPeriod: { from: new Date('2024-06-01'), to: new Date('2024-06-15') },
    payDate: new Date('2024-06-20'),
    totalPayroll: 11980.00,
    employeesPaid: 2,
     details: [
        { employeeName: 'Alice Johnson', grossPay: 3125.00, deductions: 625.00, netPay: 2500.00 },
        { employeeName: 'Bob Williams', grossPay: 1225.00, deductions: 245.00, netPay: 980.00 },
    ],
  },
];

const PAY_STUB_DATA_KEY = 'ogeemo-pay-stub-data';

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

export function PayrollHistoryView() {
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStubsOpen, setIsStubsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDownloadReport = (run: PayrollRun) => {
    toast({
        title: "Report Download Started",
        description: `Your payroll report for ${format(run.payDate, 'LLL dd, y')} is being generated.`,
    });
  };

  const handleViewStub = (employeeDetail: PayrollRun['details'][0]) => {
    if (!selectedRun) return;

    try {
        const stubData = {
            payPeriod: {
                from: selectedRun.payPeriod.from.toISOString(),
                to: selectedRun.payPeriod.to.toISOString(),
            },
            payDate: selectedRun.payDate.toISOString(),
            ...employeeDetail,
            // In a real app, you'd fetch more detailed employee info
            employeeAddress: "123 Main St, Anytown, USA",
            companyAddress: "456 Corp Ave, Business City, USA",
            companyName: "Ogeemo Inc.",
        };
        sessionStorage.setItem(PAY_STUB_DATA_KEY, JSON.stringify(stubData));
        router.push('/accounting/payroll/history/stub');
    } catch (error) {
        console.error("Failed to set stub data for navigation:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not generate the pay stub.",
        });
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Payroll History & Reports" hubPath="/accounting" hubLabel="Accounting Hub" />
        <header className="text-center">
          <h1 className="text-3xl font-bold font-headline text-primary">Payroll History</h1>
          <p className="text-muted-foreground">Review past payroll runs and access detailed reports.</p>
           <div className="mt-4">
                <Button asChild variant="outline">
                    <Link href="/accounting/payroll">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll Hub
                    </Link>
                </Button>
            </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Past Payroll Runs</CardTitle>
            <CardDescription>A complete log of all processed payrolls.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead className="text-right">Total Payroll</TableHead>
                  <TableHead className="text-center">Employees Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dummyHistory.map(run => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">
                      {format(run.payPeriod.from, 'LLL dd, y')} - {format(run.payPeriod.to, 'LLL dd, y')}
                    </TableCell>
                    <TableCell>{format(run.payDate, 'LLL dd, y')}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(run.totalPayroll)}</TableCell>
                    <TableCell className="text-center">{run.employeesPaid}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => { setSelectedRun(run); setIsDetailsOpen(true); }}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => { setSelectedRun(run); setIsStubsOpen(true); }}>
                            <FileText className="mr-2 h-4 w-4" /> View Pay Stubs
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleDownloadReport(run)}>
                            <Download className="mr-2 h-4 w-4" /> Download Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* View Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payroll Details</DialogTitle>
            <DialogDescription>
              Summary for the pay period ending {selectedRun ? format(selectedRun.payPeriod.to, 'PPP') : ''}.
            </DialogDescription>
          </DialogHeader>
          {selectedRun && (
            <div className="py-4">
              <div className="flex justify-between text-lg font-semibold mb-4">
                <span>Total Payroll:</span>
                <span>{formatCurrency(selectedRun.totalPayroll)}</span>
              </div>
              <h4 className="font-medium mb-2">Employee Payments</h4>
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Net Pay</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {selectedRun.details.map(detail => (
                        <TableRow key={detail.employeeName}>
                            <TableCell>{detail.employeeName}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(detail.netPay)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Pay Stubs Dialog */}
       <Dialog open={isStubsOpen} onOpenChange={setIsStubsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Pay Stubs</DialogTitle>
            <DialogDescription>
              Select an employee to view their pay stub for this period.
            </DialogDescription>
          </DialogHeader>
          {selectedRun && (
            <div className="py-4 space-y-2">
              {selectedRun.details.map(detail => (
                <div key={detail.employeeName} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{detail.employeeName}</span>
                    </div>
                    <Button variant="secondary" onClick={() => handleViewStub(detail)}>
                        <FileText className="mr-2 h-4 w-4" /> View Stub
                    </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStubsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
