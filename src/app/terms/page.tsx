import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";

export default function TermsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="p-8">
                <h1 className="text-3xl font-bold text-center">Terms</h1>
                <p className="mt-4">By using Ogeemo, you agree to our terms.</p>
            </main>
            <SiteFooter />
        </div>
    );
}