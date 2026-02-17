import { redirect } from 'next/navigation';
/**
 * @fileOverview This page is redundant. Content is managed in OGEEMO_SUMMARY.md.
 * Redirecting to the About page for a better user experience.
 */
export default function OgeemoSummaryPage() {
    redirect('/about');
}
