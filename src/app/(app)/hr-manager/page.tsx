import { redirect } from 'next/navigation';

export default function HrManagerRedirectPage() {
  // This page is being deprecated in favor of the new Payroll Hub
  // located under the Accounting section for better organization.
  redirect('/accounting/payroll');
}
