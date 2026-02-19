import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";

export default function ContactPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <SiteHeader />
            <main className="flex-1 p-8 text-center">
                <h1 className="text-4xl font-bold">Contact</h1>
                <p className="mt-4">Reach out to the team at Clients@ogeemo.com</p>
            </main>
            <SiteFooter />
        </div>
    );
}