
import { ReportsPageHeader } from "@/components/reports/page-header";

export default function ClientEntriesReportPage() {
  return (
    <div className="p-4 sm:p-6 flex flex-col h-full space-y-6">
      <ReportsPageHeader pageTitle="Client Entries Report" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Client Entries Report
        </h1>
        <p className="text-muted-foreground">
          Generate a detailed report of all client-related entries.
        </p>
      </header>
      <div className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed">
        <p className="text-2xl text-muted-foreground">Coming Soon.</p>
      </div>
    </div>
  );
}
