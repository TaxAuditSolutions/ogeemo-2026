import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";

export default function ForSmallBusinessesPage() {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 p-8 text-center">
            <h1 className="text-4xl font-bold">For Small Business</h1>
            <p className="mt-4">Scale your operations with Ogeemo.</p>
        </main>
        <SiteFooter />
      </div>
    );
}