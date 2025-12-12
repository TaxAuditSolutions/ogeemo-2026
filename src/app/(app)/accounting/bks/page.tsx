
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { AccountingPageHeader } from "@/components/accounting/page-header";

export default function BksWelcomePage() {
  return (
    <div className="p-4 sm:p-6 space-y-8 flex flex-col items-center">
      <AccountingPageHeader pageTitle="BKS Welcome" hubPath="/accounting" hubLabel="Accounting Tools" />
      <header className="text-center max-w-3xl">
        <h1 className="text-2xl font-bold font-headline text-primary">
          Welcome to Bookkeeping Kept Simple (BKS)
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
            Your straightforward path to financial clarity. Start with the basics, expand when you're ready.
        </p>
      </header>
      
      <Card className="w-full max-w-3xl">
        <CardHeader>
            <CardTitle>The Core Concept</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-card-foreground">
            <p className="leading-relaxed">
                This is a cash-based accounting system, that starts out simple, but allows you to advance into more advanced accounting. The heart of BKS is the Three Ledgers, which is a complete record of all the money that comes into your business (income) and all the money that goes out (expenses). The General Ledger takes it's data from the income and expense ledgers. Or you can work strictly within the General Ledger.
            </p>
            <p className="leading-relaxed">
                By consistently recording your transactions, you will capture the essential information required for tax preparation and gain a clear picture of your business's financial health. You can view all transactions at once, or focus on just income or expenses using the tabs in the ledger view.
            </p>
        </CardContent>
      </Card>

      <div className="text-center mt-4">
          <Button asChild size="lg">
              <Link href="/accounting/ledgers">
                Go to BKS Ledgers <BookOpen className="ml-2 h-5 w-5" />
              </Link>
          </Button>
      </div>
    </div>
  );
}
