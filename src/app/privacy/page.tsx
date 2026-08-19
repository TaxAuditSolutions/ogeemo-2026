'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Mail, MapPin, Database, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPolicyPage() {
    const lastUpdated = "August 13, 2026";

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <SiteHeader />
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative w-full py-20 md:py-28 overflow-hidden bg-gradient-to-b from-primary/5 to-background border-b">
                    <div className="container px-4 max-w-4xl mx-auto relative z-10 text-center space-y-6">
                        <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px] font-bold">
                            Legal
                        </Badge>
                        <h1 className="text-5xl md:text-7xl font-bold font-headline text-primary tracking-tighter leading-none">
                            Privacy Policy
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Your data is your property. This policy explains what we collect, how we use it, and the controls you have.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Last updated: {lastUpdated}</p>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-0 opacity-50" />
                </section>

                {/* Policy Content */}
                <section className="py-20 container px-4 max-w-3xl mx-auto">
                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-12">

                        {/* Introduction */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">1. Introduction</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                Ogeemo Inc. ("Ogeemo," "we," "us," or "our") is a cloud-based business management platform headquartered in Vancouver, BC, Canada. We provide accounting, human resources, customer relationship management (CRM), project management, and AI-powered automation tools to small businesses, consultants, and professional service firms.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website (www.ogeemo.com) and our software platform (the "Ogeemo Suite"). We are committed to transparency and to treating your data as we would want our own treated.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                By creating an account or using our services, you agree to the practices described in this policy. If you do not agree, please do not use our services.
                            </p>
                        </div>

                        {/* Information We Collect */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <Database className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">2. Information We Collect</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed font-medium">We collect only the information necessary to provide our services:</p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li><strong>Account Information:</strong> Your name, email address, and password (encrypted) when you register. If you sign in with Google, we receive your Google account name and email.</li>
                                <li><strong>Business Data:</strong> The data you voluntarily enter into the platform, including contacts, financial transactions, invoices, payroll information, time logs, project details, and documents you upload.</li>
                                <li><strong>Usage Data:</strong> Information about how you interact with the platform, including IP address, browser type, device information, and log data for security and troubleshooting purposes.</li>
                                <li><strong>Communication Data:</strong> Records of communications you send through our platform (e.g., emails logged in the Email Hub, meeting notes).</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>We do not collect sensitive financial information directly.</strong> Payment processing is handled by third-party providers. We do not store credit card numbers on our servers.
                            </p>
                        </div>

                        {/* How We Use Information */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <Eye className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">3. How We Use Your Information</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">We use your information to:</p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>Provide, maintain, and improve the Ogeemo Suite and its features</li>
                                <li>Authenticate your identity and manage your account</li>
                                <li>Process transactions, including subscription payments and payroll</li>
                                <li>Communicate with you about your account, updates, and support requests</li>
                                <li>Generate AI-powered insights and automation using Google AI services</li>
                                <li>Maintain security, prevent fraud, and ensure audit-readiness</li>
                                <li>Comply with legal obligations, including tax and accounting regulations</li>
                                <li>Aggregate and anonymize data for analytics to improve our platform</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                We <strong>never sell your data</strong> to third parties. Your business data is your property, not ours.
                            </p>
                        </div>

                        {/* Data Storage and Security */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">4. Data Storage and Security</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                Your data is stored using <strong>Google Firebase</strong> infrastructure, including:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li><strong>Cloud Firestore:</strong> Structured business data (contacts, transactions, projects)</li>
                                <li><strong>Firebase Authentication:</strong> Secure user authentication and session management</li>
                                <li><strong>Cloud Storage:</strong> Documents, images, and files you upload</li>
                                <li><strong>Cloud Functions:</strong> Server-side processing for payroll, invoicing, and AI operations</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                We implement industry-standard security measures, including:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>Role-based access control (RBAC) with granular permissions</li>
                                <li>Firestore security rules that enforce data access at the database level</li>
                                <li>Encrypted data transmission (TLS/SSL)</li>
                                <li>Regular security audits and rule reviews</li>
                                <li>Separation of duties between admin and user roles</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                Data is stored on Google Cloud Platform servers. While we primarily serve Canadian and North American clients, your data may be processed on servers located in various regions as part of Google's global infrastructure.
                            </p>
                        </div>

                        {/* AI and Data Processing */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">5. AI and Data Processing</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                Ogeemo integrates AI capabilities through <strong>Google Genkit and Google AI</strong> services. These include:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li><strong>AI Dispatch Terminal:</strong> Natural-language commands processed to trigger platform actions</li>
                                <li><strong>AI Search:</strong> Intelligent search across your platform data</li>
                                <li><strong>Sandbox Agent:</strong> An AI assistant trained on Ogeemo's public knowledge base to help you navigate features</li>
                                <li><strong>Image Generation:</strong> AI-powered image creation for marketing content</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>Your private business data is not used to train AI models.</strong> AI features process your data only to provide the requested service (e.g., searching your contacts, generating a report). The Sandbox Agent is trained on public documentation, not your private business records.
                            </p>
                        </div>

                        {/* Data Sharing */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">6. Data Sharing and Disclosure</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We do not sell, rent, or trade your personal information. We may share data in these limited circumstances:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li><strong>Service Providers:</strong> We use third-party services (Google Firebase, payment processors) that have access to your data solely to perform services on our behalf. They are bound by confidentiality obligations.</li>
                                <li><strong>Legal Compliance:</strong> If required by law, court order, or government regulation, we may disclose your data. Ogeemo is designed to be audit-ready, and you may export your own records for tax or legal purposes at any time.</li>
                                <li><strong>Mentor Marketplace:</strong> If you engage a Certified Mentor through our platform, we share the information necessary to facilitate that consulting relationship. Mentor engagements are governed by separate terms.</li>
                                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset sale, your data may be transferred as part of that transaction. We will notify you before your data is transferred under different ownership.</li>
                            </ul>
                        </div>

                        {/* Your Rights */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">7. Your Rights and Controls</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We believe in the <strong>"Ethical Exit"</strong> — the easier it is to leave, the more likely you are to stay. You have the right to:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li><strong>Access:</strong> View and export your data at any time using the platform's built-in backup and export tools</li>
                                <li><strong>Correct:</strong> Update or correct your personal and business information directly within the platform</li>
                                <li><strong>Delete:</strong> Request deletion of your account and associated data. Some records may be retained for legal or tax compliance purposes as required by law.</li>
                                <li><strong>Portability:</strong> Export your data in a structured format. No hidden fees, no hostage situations.</li>
                                <li><strong>Withdraw Consent:</strong> Disable AI features or revoke data processing consent at any time</li>
                                <li><strong>Object:</strong> Object to certain uses of your data, including for marketing purposes</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                To exercise any of these rights, contact us at <a href="mailto:clients@ogeemo.com" className="text-primary underline">clients@ogeemo.com</a>.
                            </p>
                        </div>

                        {/* Cookies */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">8. Cookies and Tracking</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Ogeemo uses essential cookies to maintain your authentication session and provide core functionality. We do not use advertising cookies or third-party tracking pixels for marketing purposes.
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li><strong>Authentication Cookies:</strong> Required for login and session management</li>
                                <li><strong>Functional Cookies:</strong> Remember your preferences and settings within the platform</li>
                                <li><strong>Analytics:</strong> We may use privacy-respecting analytics to understand aggregate usage patterns. No personally identifiable information is shared with advertising networks.</li>
                            </ul>
                        </div>

                        {/* Data Retention */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">9. Data Retention</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We retain your data for as long as your account is active. If you cancel your subscription:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>Your data remains accessible for <strong>30 days</strong> after cancellation, allowing you to export it</li>
                                <li>After 30 days, your data is permanently deleted from our active systems</li>
                                <li>Backup copies may be retained for an additional period for disaster recovery, after which they are also permanently deleted</li>
                                <li>Certain records may be retained longer if required by Canadian tax law or other legal obligations</li>
                            </ul>
                        </div>

                        {/* Children's Privacy */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">10. Children's Privacy</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Ogeemo is a business management platform intended for use by professionals and businesses. We do not knowingly collect information from children under 16. If you believe we have collected information from a minor, please contact us immediately.
                            </p>
                        </div>

                        {/* International Users */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">11. International Users</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Ogeemo is based in Canada. If you access our services from outside Canada, your data will be processed in accordance with Canadian privacy laws, including the Personal Information Protection and Electronic Documents Act (PIPEDA). By using our services, you consent to the transfer and processing of your data in Canada and potentially on global cloud infrastructure.
                            </p>
                        </div>

                        {/* Policy Changes */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">12. Changes to This Policy</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We may update this Privacy Policy from time to time. When we do, we will:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>Update the "Last updated" date at the top of this page</li>
                                <li>Notify active members of material changes via email or in-platform notification</li>
                                <li>Never retroactively reduce your privacy protections without explicit notice and consent</li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">13. Contact Us</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                If you have questions about this Privacy Policy or how we handle your data, please contact us:
                            </p>
                            <div className="bg-muted/30 p-6 rounded-2xl border border-primary/10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-5 w-5 text-primary" />
                                    <a href="mailto:clients@ogeemo.com" className="text-primary underline font-medium">clients@ogeemo.com</a>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="h-5 w-5 text-primary" />
                                    <span className="text-muted-foreground font-medium">Vancouver, BC, Canada</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-primary text-primary-foreground text-center">
                    <div className="container px-4 space-y-6">
                        <h2 className="text-3xl md:text-4xl font-bold font-headline tracking-tight">Your data. Your property.</h2>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">Join a platform that respects your privacy as much as your productivity.</p>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}