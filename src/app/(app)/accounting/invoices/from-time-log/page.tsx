
'use client';

// This page is now obsolete. The functionality has been integrated
// directly into the invoice generator via a modal dialog.
// This redirect is for backward compatibility.
import { redirect } from 'next/navigation';

export default function InvoiceFromTimeLogRedirectPage() {
    redirect('/accounting/invoices/create');
}
