
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck } from "lucide-react";

export default function TermsPage() {
    return (
        <main className="container mx-auto px-4 py-8 md:py-16">
            <Card className="max-w-4xl mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold font-headline">Terms & Conditions</CardTitle>
                    <CardDescription>Last Updated: {new Date().toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96 w-full rounded-md border p-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <h3 className="font-bold mb-2">Beta Program Disclaimer of Liability</h3>
                            <p>
                                This Beta Program is provided "as is" without warranty of any kind, express or implied. By participating, you acknowledge that Ogeemo and its affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data, or other intangible losses (even if Ogeemo has been advised of the possibility of such damages), resulting from the use or the inability to use the service.
                            </p>
                            <p>
                                You agree to indemnify and hold harmless Ogeemo, its contractors, and its licensors, and their respective directors, officers, employees, and agents from and against any and all claims and expenses, including attorneys’ fees, arising out of your use of the application, including but not limited to your violation of this Agreement.
                            </p>

                            <h3 className="font-bold mt-4 mb-2">1. Acceptance of Terms</h3>
                            <p>
                                By accessing and using the Ogeemo platform, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement.
                            </p>

                            <h3 className="font-bold mt-4 mb-2">2. Description of Service</h3>
                            <p>
                                Ogeemo provides users with access to a rich collection of resources, including various business management tools, communication tools, and personalized content. You understand and agree that the Service may include advertisements and that these advertisements are necessary for Ogeemo to provide the Service.
                            </p>
                            
                             <h3 className="font-bold mt-4 mb-2">3. User Conduct</h3>
                            <p>
                                You are responsible for all information, data, text, software, music, sound, photographs, graphics, video, messages or other materials ("Content") that you upload, post, publish or display. Ogeemo reserves the right to investigate and take appropriate legal action against anyone who, in Ogeemo's sole discretion, violates this provision.
                            </p>

                            <h3 className="font-bold mt-4 mb-2">4. Modification of Terms</h3>
                            <p>
                                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                            </p>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </main>
    );
}
