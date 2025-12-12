
import { redirect } from 'next/navigation';

export default function T2125RedirectPage() {
  // This page is now located at /accounting/reports/income-statement
  redirect('/accounting/reports/income-statement');
}
