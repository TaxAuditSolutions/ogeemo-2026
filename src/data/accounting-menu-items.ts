

import {
    FileDigit,
    FileOutput,
    ListPlus,
    TrendingUp,
    TrendingDown,
    BookText,
    FileText,
    ShieldCheck,
    Percent,
    FileInput,
    WalletCards,
    Banknote,
    BarChart3,
    Activity,
    UserPlus,
    FileSignature,
    Info,
    Landmark,
} from 'lucide-react';
import type { MenuItem } from '@/lib/menu-items';

export const accountingMenuItems: MenuItem[] = [
    { href: "/accounting/invoices/create", icon: FileDigit, label: "Create Invoice" },
    { href: "/accounting/accounts-receivable", icon: FileOutput, label: "Accounts Receivable" },
    { href: "/accounting/service-items", icon: ListPlus, label: "Products & Services" },
    { href: "/accounting/ledgers?tab=income", icon: TrendingUp, label: "Manage Income" },
    { href: "/accounting/ledgers?tab=expenses", icon: TrendingDown, label: "Manage Expenses" },
    { href: "/accounting/ledgers", icon: BookText, label: "General Ledger" },
    { href: "/accounting/reports/income-statement", icon: FileText, label: "Income Statement"},
    { href: "/accounting/tax/sales-tax", icon: Percent, label: "Sales Tax Calculator" },
    { href: "/accounting/accounts-payable", icon: FileInput, label: "Accounts Payable" },
    { href: "/accounting/loan-manager", icon: Landmark, label: "Loan Manager" },
    { href: "/accounting/bank-statements", icon: WalletCards, label: "Bank Statements" },
    { href: "/accounting/asset-management", icon: WalletCards, label: "Capital Assets" },
    { href: "/accounting/payroll", icon: Banknote, label: "Payroll" },
    { href: "/accounting/reports", icon: BarChart3, label: "Reporting Hub" },
    { href: "/accounting/tax", icon: ShieldCheck, label: "Tax Center" },
    { href: "/accounting/tax/categories", icon: FileSignature, label: "Tax Categories" },
    { href: "/accounting/financial-snapshot", icon: Activity, label: "Financial Snapshot" },
    { href: "/accounting/financial-snapshot?summary=matchbook", icon: FileDigit, label: "Matchbook Loan Summary" },
    { href: "/accounting/loan-application", icon: FileText, label: "Generic Loan Application" },
    { href: "/accounting/onboarding", icon: UserPlus, label: "Client Onboarding" },
    { href: "/accounting/bks", icon: Info, label: "BKS Welcome" },
];

export default accountingMenuItems;
