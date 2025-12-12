
import { redirect } from 'next/navigation';

export default function InvoiceItemsRedirectPage() {
  // This page is now obsolete. The main view for service items is now /accounting/service-items
  // This redirect is for backward compatibility.
  redirect('/accounting/service-items');
}
