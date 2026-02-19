import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";

export default function ForVirtualAssistantsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1 p-8 text-center">
                <h1 className="text-4xl font-bold">For Virtual Assistants</h1>
                <p className="mt-4 text-muted-foreground">Manage multiple clients with ease.</p>
            </main>
            <SiteFooter />
        </div>
    );
}