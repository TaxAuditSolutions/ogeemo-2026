
import { redirect } from 'next/navigation';

export default function InvoicesRedirectPage() {
  // This page is now obsolete. The main view for invoices is the Accounts Receivable page.
  // Redirect users there to avoid confusion.
  redirect('/accounting/accounts-receivable');
}
