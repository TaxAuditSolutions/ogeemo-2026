'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, FileText, Download, Eye, ArrowLeft, LoaderCircle } from 'lucide-react';
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { RunDetailsDialog, RunStubsDialog, formatDay } from '@/components/accounting/payroll-run-dialogs';
import { useToast } from '@/hooks/use-toast';
import { usePayrollHistory } from '@/hooks/use-payroll-history';
import type { PayrollRunDetail, SavedPayrollRun } from '@/services/payroll-service';
import { buildPayrollRunCsv } from '@/lib/payroll-report';
import { buildPayStub, workerAddressLine } from '@/lib/payroll-stub';
import { formatCurrency } from '@/lib/utils';

const PAY_STUB_DATA_KEY = 'ogeemo-pay-stub-data';

export function PayrollHistoryView() {
  const { runs, workers, company, isLoading, loadError, reload } = usePayrollHistory();
  const [selectedRun, setSelectedRun] = useState<SavedPayrollRun | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStubsOpen, setIsStubsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const totals = useMemo(() => ({
    gross: runs.reduce((sum, run) => sum + run.totalGrossPay, 0),
    net: runs.reduce((sum, run) => sum + run.totalNetPay, 0),
  }), [runs]);

  const handleDownloadReport = (run: SavedPayrollRun) => {
    const csv = buildPayrollRunCsv(run, run.details);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-${run.periodStart}-to-${run.periodEnd}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Report downloaded', description: `Payroll for ${formatDay(run.periodStart)} to ${formatDay(run.periodEnd)} saved as a CSV file.` });
  };

  const handleViewStub = (detail: PayrollRunDetail) => {
    if (!selectedRun) return;
    const worker = workers.find((w) => w.id === detail.employeeId);
    const stub = buildPayStub(runs, selectedRun, detail, company, workerAddressLine(worker));
    try {
      sessionStorage.setItem(PAY_STUB_DATA_KEY, JSON.stringify(stub));
      router.push('/accounting/payroll/history/stub');
    } catch (error) {
      console.error('Failed to set stub data for navigation:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not generate the pay stub.' });
    }
  };

  const message = (children: React.ReactNode, destructive = false) => (
    <TableRow>
      <TableCell colSpan={6} className={destructive ? 'h-24 text-center text-destructive' : 'h-24 text-center text-muted-foreground'}>{children}</TableCell>
    </TableRow>
  );

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <AccountingPageHeader pageTitle="Payroll History & Reports" hubPath="/accounting" hubLabel="Accounting Hub" />
        <header className="text-center">
          <h1 className="text-3xl font-bold font-headline text-primary">Payroll History</h1>
          <p className="text-muted-foreground">Review past payroll runs and access detailed reports.</p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/accounting"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Accounting Hub</Link>
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Past Payroll Runs</CardTitle>
            <CardDescription>
              {runs.length > 0
                ? `${runs.length} payroll run${runs.length === 1 ? '' : 's'}, ${formatCurrency(totals.gross)} gross and ${formatCurrency(totals.net)} net in total.`
                : 'A complete log of all processed payrolls.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead className="text-center">Employees Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>

                {isLoading ? message(<LoaderCircle className="mx-auto h-6 w-6 animate-spin" />)
                  : loadError ? message(<>{loadError} <Button variant="link" onClick={reload}>Try again</Button></>, true)
                  : runs.length === 0 ? message(<>No payroll has been run yet. <Link href="/accounting/payroll/run" className="underline font-semibold">Run payroll</Link> and it will appear here.</>)
                  : runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{formatDay(run.periodStart)} - {formatDay(run.periodEnd)}</TableCell>
                      <TableCell>{formatDay(run.payDate)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(run.totalGrossPay)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(run.totalNetPay)}</TableCell>
                      <TableCell className="text-center">{run.employeeCount}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /><span className="sr-only">Open menu</span></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => { setSelectedRun(run); setIsDetailsOpen(true); }}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => { setSelectedRun(run); setIsStubsOpen(true); }}><FileText className="mr-2 h-4 w-4" /> View Pay Stubs</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDownloadReport(run)}><Download className="mr-2 h-4 w-4" /> Download Report (CSV)</DropdownMenuItem>
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

      <RunDetailsDialog run={selectedRun} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
      <RunStubsDialog run={selectedRun} open={isStubsOpen} onOpenChange={setIsStubsOpen} onViewStub={handleViewStub} />
    </>
  );
}
