'use client';

import React from 'react';
import Link from 'next/link';
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle, 
    CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    ClipboardList, 
    FileText, 
    Clock, 
    Search, 
    TrendingUp, 
    Scale,
    ArrowRight,
    Briefcase,
    Activity,
    Users,
    X,
    Database,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    category: 'Operations' | 'Finance' | 'Intelligence' | 'Freedom';
}

const ReportCard = ({ title, description, icon: Icon, href, category }: ReportCardProps) => (
    <Card className="flex flex-col hover:shadow-lg transition-all group border-primary/10">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold">
                    {category}
                </Badge>
            </div>
            <CardTitle className="mt-4">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
        </CardHeader>
        <CardFooter className="mt-auto pt-0">
            <Button asChild variant="ghost" className="w-full justify-between hover:bg-primary/5 hover:text-primary p-0 h-auto font-bold uppercase text-[10px] tracking-widest">
                <Link href={href}>
                    {category === 'Freedom' ? 'Access Data' : 'Generate Report'}
                    <ArrowRight className="h-3 w-3" />
                </Link>
            </Button>
        </CardFooter>
    </Card>
);

const Badge = ({ children, variant, className }: any) => (
    <div className={cn(
        "px-2 py-0.5 rounded-full border text-[10px] font-bold",
        variant === 'outline' ? "border-muted-foreground/20 text-muted-foreground" : "bg-primary/10 text-primary border-primary/20",
        className
    )}>
        {children}
    </div>
);

export default function ReportsHubPage() {
    return (
        <div className="p-4 sm:p-6 space-y-8 flex flex-col items-center bg-muted/10 min-h-full">
            <header className="text-center relative w-full max-w-5xl">
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    <ClipboardList className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Reports Hub</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Unified business intelligence. Transform your operational signals into defensible professional evidence.
                </p>
                <div className="absolute top-0 right-0">
                    <Button asChild variant="ghost" size="icon">
                        <Link href="/action-manager"><X className="h-5 w-5" /></Link>
                    </Button>
                </div>
            </header>

            <div className="w-full max-w-6xl space-y-12 pb-20">
                {/* Operations Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 border-b pb-2 border-primary/20">
                        <Briefcase className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold uppercase tracking-widest text-primary/80">Operational Evidence</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ReportCard 
                            title="Work Activity Summary"
                            description="High-fidelity timeline of all sessions and tasks for a specific client node."
                            icon={ClipboardList}
                            href="/reports/work-activity"
                            category="Operations"
                        />
                        <ReportCard 
                            title="Worker Time Logs"
                            description="Comprehensive registry of work sessions attributed to specific staff members."
                            icon={Clock}
                            href="/reports/time-log"
                            category="Operations"
                        />
                        <ReportCard 
                            title="Client Time Log"
                            description="Unbilled and billed hours scoped strictly to client engagements."
                            icon={Users}
                            href="/reports/client-time-log"
                            category="Operations"
                        />
                    </div>
                </section>

                {/* Finance Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 border-b pb-2 border-primary/20">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold uppercase tracking-widest text-primary/80">Financial Intelligence</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ReportCard 
                            title="Client Statement"
                            description="Full ledger history showing invoices vs payments for any account node."
                            icon={FileText}
                            href="/reports/client-statement"
                            category="Finance"
                        />
                        <ReportCard 
                            title="Income Statement (T2125)"
                            description="Year-to-date business performance categorized by CRA tax lines."
                            icon={Activity}
                            href="/accounting/reports/income-statement"
                            category="Finance"
                        />
                        <ReportCard 
                            title="Accrual Adjustments"
                            description="Bridge the gap between your cash-basis BKS and accrual requirements."
                            icon={Scale}
                            href="/accounting/reports/accrual-adjustments"
                            category="Finance"
                        />
                    </div>
                </section>

                {/* Discovery Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 border-b pb-2 border-primary/20">
                        <Search className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold uppercase tracking-widest text-primary/80">Global Discovery</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ReportCard 
                            title="Advanced AI Search"
                            description="Natural language search across contacts, files, and project nodes."
                            icon={Search}
                            href="/reports/search"
                            category="Intelligence"
                        />
                    </div>
                </section>

                {/* Data Portability Mandate Section */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2 border-b pb-2 border-primary/20">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-bold uppercase tracking-widest text-primary/80">Data Portability (Anti-Greed)</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ReportCard 
                            title="Export My Data"
                            description="Absolute ownership of your evidence. Download your full BKS ledger and vault at any time."
                            icon={Database}
                            href="/backup"
                            category="Freedom"
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}
