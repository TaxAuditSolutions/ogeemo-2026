
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDigit, Printer, ArrowRight } from 'lucide-react';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';

interface MetricDisplayProps {
  label: string;
  value: string;
  colorClass?: string;
}

const MetricDisplay = ({ label, value, colorClass = 'text-foreground' }: MetricDisplayProps) => (
  <div className="flex justify-between items-baseline p-3 border-b">
    <p className="text-sm text-muted-foreground">{label}:</p>
    <p className={`text-lg font-bold font-mono ${colorClass}`}>{value}</p>
  </div>
);

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};


interface MatchbookLoanSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  metrics: {
    netIncome: number;
    totalAssets: number;
    totalLiabilities: number;
    netEquity: number;
  };
}

export function MatchbookLoanSummaryDialog({ isOpen, onOpenChange, metrics }: MatchbookLoanSummaryDialogProps) {
  const { handlePrint, contentRef } = useReactToPrint();
  const [loanAmount, setLoanAmount] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [personalGuarantee, setPersonalGuarantee] = useState(false);
  const router = useRouter();

  const handleProceed = () => {
    const params = new URLSearchParams();
    if (loanAmount) params.set('amount', loanAmount);
    if (loanPurpose) params.set('purpose', loanPurpose);
    router.push(`/accounting/loan-application?${params.toString()}`);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <div ref={contentRef} className="p-6">
            <DialogHeader className="print:text-black text-center mb-6">
                <DialogTitle className="flex items-center justify-center gap-2 text-primary print:text-black text-2xl">
                    <FileDigit className="h-6 w-6" />
                    Matchbook Loan Summary
                </DialogTitle>
                <DialogDescription className="print:text-gray-600">
                    A high-level summary of your business's financial health for loan discussions.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="loanAmount">Loan Amount Requested</Label>
                    <Input id="loanAmount" placeholder="$50,000" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="print:border-none" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="loanPurpose">Purpose of Loan</Label>
                    <Textarea id="loanPurpose" placeholder="e.g., To purchase new equipment and expand operations..." value={loanPurpose} onChange={(e) => setLoanPurpose(e.target.value)} className="print:border-none" />
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="guarantee" checked={personalGuarantee} onCheckedChange={(checked) => setPersonalGuarantee(!!checked)} />
                    <Label htmlFor="guarantee">I will personally guarantee this loan</Label>
                </div>
            </div>
            <Separator className="my-6" />
            <div className="py-4 space-y-2">
                <MetricDisplay
                    label="Net Income (YTD)"
                    value={formatCurrency(metrics.netIncome)}
                    colorClass={metrics.netIncome >= 0 ? 'text-green-600 print:text-green-600' : 'text-destructive print:text-red-600'}
                />
                <MetricDisplay
                    label="Total Assets"
                    value={formatCurrency(metrics.totalAssets)}
                />
                <MetricDisplay
                    label="Total Liabilities"
                    value={formatCurrency(metrics.totalLiabilities)}
                />
                <MetricDisplay
                    label="Owner's Equity"
                    value={formatCurrency(metrics.netEquity)}
                />
            </div>
        </div>
        <DialogFooter className="print:hidden p-6 pt-0 sm:justify-between">
          <Button onClick={handleProceed}>Proceed to Full Application <ArrowRight className="ml-2 h-4 w-4"/></Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print Summary
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
