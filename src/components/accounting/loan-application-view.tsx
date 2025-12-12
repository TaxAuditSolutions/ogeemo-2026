
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { LoaderCircle, FileText, Printer, ArrowLeft, Landmark } from 'lucide-react';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, type UserProfile } from '@/services/user-profile-service';
import { getAssets, getLoans, type Asset, type Loan } from '@/services/accounting-service';
import { AccountingPageHeader } from './page-header';

const formatCurrency = (amount: number | string) => {
    const num = Number(amount);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(num);
};

const FormRow = ({ label, value, id, isCurrency = false }: { label: string, value: any, id: string, isCurrency?: boolean }) => (
    <div className="grid grid-cols-3 items-center gap-4">
        <Label htmlFor={id} className="text-right">{label}</Label>
        <Input id={id} defaultValue={isCurrency ? formatCurrency(value) : value} className="col-span-2" />
    </div>
);

const Section = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
    <div className="space-y-4 pt-6">
        <div className="border-b pb-2">
            <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-4">{children}</div>
    </div>
);

export function LoanApplicationView() {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const { handlePrint, contentRef } = useReactToPrint();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [loanAmount, setLoanAmount] = useState(searchParams.get('amount') || '');
    const [loanPurpose, setLoanPurpose] = useState(searchParams.get('purpose') || '');
    
    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [profileData, assetsData, loansData] = await Promise.all([
                getUserProfile(user.uid),
                getAssets(user.uid),
                getLoans(user.uid),
            ]);
            setProfile(profileData);
            setAssets(assetsData);
            setLoans(loansData);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load application data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const { totalAssets, totalLiabilities } = useMemo(() => {
        const capitalAssets = assets.reduce((sum, asset) => sum + asset.undepreciatedCapitalCost, 0);
        const payableLoans = loans.filter(l => l.loanType === 'payable').reduce((sum, l) => sum + l.outstandingBalance, 0);
        const receivableLoans = loans.filter(l => l.loanType === 'receivable').reduce((sum, l) => sum + l.outstandingBalance, 0);
        
        // This is a simplified calculation for the form.
        // A real balance sheet would include cash, A/R, A/P, etc.
        return { totalAssets: capitalAssets + receivableLoans, totalLiabilities: payableLoans };
    }, [assets, loans]);

    if (isLoading) {
        return <div className="flex h-full w-full items-center justify-center p-4"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle="Loan Application" hubPath="/accounting" hubLabel="Accounting Hub" />
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">Generic Loan Application</h1>
                <p className="text-muted-foreground">A pre-populated form to streamline your loan application process.</p>
            </header>

            <Card ref={contentRef} className="max-w-4xl mx-auto print:border-none print:shadow-none">
                <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2"><Landmark/> Loan Application Form</CardTitle>
                    <CardDescription>
                        Information on this form is pre-populated from your Ogeemo account. Review, fill in the blanks, and print.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 p-6 print:p-0">
                    <Section title="Applicant Information" description="Your personal and business contact details.">
                        <FormRow id="applicantName" label="Full Name" value={profile?.displayName || ''} />
                        <FormRow id="applicantEmail" label="Email Address" value={profile?.email || ''} />
                        <FormRow id="applicantPhone" label="Primary Phone" value={profile?.bestPhone === 'cell' ? profile.cellPhone : profile?.businessPhone || ''} />
                    </Section>

                    <Section title="Business Information" description="Details about your registered business.">
                        <FormRow id="businessName" label="Legal Business Name" value={profile?.companyName || ''} />
                        <FormRow id="businessAddress" label="Business Address" value={profile?.businessAddress?.street || ''} />
                        <FormRow id="businessNumber" label="Business Number (BN)" value={profile?.businessNumber || ''} />
                    </Section>

                    <Section title="Loan Request Details" description="Information about the loan you are requesting.">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="loanAmountReq" className="text-right">Loan Amount Requested</Label>
                            <Input id="loanAmountReq" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="$0.00" className="col-span-2"/>
                        </div>
                        <div className="grid grid-cols-3 items-start gap-4">
                            <Label htmlFor="loanPurposeReq" className="text-right pt-2">Purpose of Loan</Label>
                            <Textarea id="loanPurposeReq" value={loanPurpose} onChange={(e) => setLoanPurpose(e.target.value)} placeholder="Describe how you will use the funds..." className="col-span-2"/>
                        </div>
                    </Section>

                    <Section title="Financial Overview" description="A simplified summary of your current financial position.">
                        <FormRow id="totalAssets" label="Total Assets" value={totalAssets} isCurrency={true} />
                        <FormRow id="totalLiabilities" label="Total Liabilities" value={totalLiabilities} isCurrency={true} />
                        <FormRow id="ownersEquity" label="Owner's Equity" value={profile?.netEquity || 0} isCurrency={true} />
                    </Section>
                    
                    <Section title="Declaration" description="Please read and sign below.">
                        <p className="text-xs text-muted-foreground p-4 border rounded-md">
                            I hereby declare that the information provided in this loan application is true, correct, and complete to the best of my knowledge. I understand that any misrepresentation may result in the rejection of my application or the recall of any loan granted. I authorize the lender to verify this information from any source it deems appropriate.
                        </p>
                        <div className="grid grid-cols-2 gap-8 pt-12">
                            <div className="border-t pt-2">
                                <Label>Signature of Applicant</Label>
                            </div>
                            <div className="border-t pt-2">
                                <Label>Date</Label>
                            </div>
                        </div>
                    </Section>
                </CardContent>
                <CardFooter className="print:hidden justify-end">
                    <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print Application</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
