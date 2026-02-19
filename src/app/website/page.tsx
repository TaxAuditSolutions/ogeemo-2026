import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 container px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary mb-6">
          Ogeemo: Your Business Command Center
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          The all-in-one platform that unifies accounting, projects, and CRM.
        </p>
        <Button asChild size="lg">
          <Link href="/register">Get Started</Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}