import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";

export default function PrivacyPolicyPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="p-8">
                <h1 className="text-3xl font-bold text-center">Privacy</h1>
                <p className="mt-4">Your data is safe with us.</p>
            </main>
            <SiteFooter />
        </div>
    );
}
