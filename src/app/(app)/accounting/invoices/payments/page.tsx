
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

// This page has been renamed to Accounts Receivable and moved.
// This redirect is for backward compatibility.
import { redirect } from 'next/navigation';

export default function InvoicePaymentsRedirectPage() {
    redirect('/accounting/accounts-receivable');
}
