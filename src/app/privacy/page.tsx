import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert } from "lucide-react";

export default function PrivacyPolicyPage() {
    return (
        <main className="container mx-auto px-4 py-8 md:py-16">
            <Card className="max-w-4xl mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <ShieldAlert className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold font-headline">Privacy Policy</CardTitle>
                    <CardDescription>Last Updated: {new Date().toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96 w-full rounded-md border p-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p>
                                Welcome to Ogeemo. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
                            </p>

                            <h3 className="font-bold mt-4 mb-2">1. Information We Collect</h3>
                            <p>
                                We may collect information about you in a variety of ways. The information we may collect via the Application includes:
                            </p>
                            <ul>
                                <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and telephone number, that you voluntarily give to us when you register with the Application.</li>
                                <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Application, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Application.</li>
                                <li><strong>Financial Data:</strong> Data related to your business that you input into the application, such as income, expenses, invoices, and other financial transactions. This data is stored securely and is only accessible by you.</li>
                            </ul>

                            <h3 className="font-bold mt-4 mb-2">2. Use of Your Information</h3>
                            <p>
                                Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:
                            </p>
                             <ul>
                                <li>Create and manage your account.</li>
                                <li>Provide you with the core services of the application.</li>
                                <li>Email you regarding your account or order.</li>
                                <li>Monitor and analyze usage and trends to improve your experience with the Application.</li>
                                <li>Notify you of updates to the Application.</li>
                            </ul>

                            <h3 className="font-bold mt-4 mb-2">3. Disclosure of Your Information</h3>
                            <p>
                                We do not share your information with third parties except in the following situations:
                            </p>
                             <ul>
                                <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</li>
                                <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including data analysis, hosting services, and customer service. Our third-party providers include Google Firebase for database and authentication services.</li>
                            </ul>
                            
                             <h3 className="font-bold mt-4 mb-2">4. Security of Your Information</h3>
                            <p>
                                We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                            </p>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </main>
    );
}
