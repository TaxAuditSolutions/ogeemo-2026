'use client';

import { SiteHeader } from "@/components/landing/header";
import { SiteFooter } from "@/components/landing/footer";
import { Badge } from "@/components/ui/badge";
import { FileSignature, Lock, Scale, Users, CreditCard, ShieldCheck, AlertTriangle, Gavel, Mail, MapPin } from "lucide-react";

export default function TermsOfServicePage() {
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
                            Terms of Service
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            The rules of the road. Plain language, fair terms, and a price lock that means what it says.
                        </p>
                        <p className="text-sm text-muted-foreground italic">Last updated: {lastUpdated}</p>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-0 opacity-50" />
                </section>

                {/* Policy Content */}
                <section className="py-20 container px-4 max-w-3xl mx-auto">
                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-12">

                        {/* Acceptance of Terms */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <FileSignature className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">1. Acceptance of Terms</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                Welcome to Ogeemo. By creating an account, signing in, or using our website (www.ogeemo.com) or software platform (the "Ogeemo Suite"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use our services.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                These Terms form a legally binding agreement between you ("Member," "you," or "your") and Ogeemo Inc. ("Ogeemo," "we," "us," or "our"). If you are using Ogeemo on behalf of a business, you represent that you have the authority to bind that business to these Terms.
                            </p>
                        </div>

                        {/* Description of Service */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">2. Description of Service</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Ogeemo provides a cloud-based business management platform that includes accounting, invoicing, payroll, customer relationship management (CRM), project management, document management, time tracking, inventory management, and AI-powered automation tools. The platform is offered as a subscription-based Software-as-a-Service (SaaS) product.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                We provide access to the full Ogeemo Suite to all paying members. We do not gate features by tier. The specific features available may evolve as we continue to develop the platform, but we commit to never reducing the core utility you signed up for.
                            </p>
                        </div>

                        {/* Membership and Pricing */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">3. Membership and Pricing</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-muted/30 p-6 rounded-2xl border border-primary/10">
                                    <h3 className="font-bold text-lg mb-3 text-primary">Circle Membership</h3>
                                    <ul className="space-y-2 text-muted-foreground">
                                        <li><strong>Price:</strong> $30.00 CAD per month (total)</li>
                                        <li><strong>Includes:</strong> 5 user seats</li>
                                        <li><strong>Additional users:</strong> $5.00 CAD per user per month</li>
                                        <li><strong>Free trial:</strong> 30 days, no credit card required</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>Price Lock Guarantee.</strong> Your membership fee is locked for the life of your subscription. We will not increase your base rate as long as your account remains in good standing and your subscription is active. This is our commitment to you — no bait-and-switch pricing, no surprise increases.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>Legacy Founding Rate.</strong> The first 100 paying members were granted the founding rate of $25.00/month, locked for life. New members join at $30.00/month total, and existing members' rates are never affected by pricing changes for new signups.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>Billing.</strong> Subscription fees are billed monthly in advance. Payment is processed through our third-party payment provider. If a payment fails, we will notify you and provide a grace period. If payment is not resolved within 15 days, access to the Ogeemo Suite may be suspended (read-only access to your data will remain available for 30 days).
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>Taxes.</strong> Applicable taxes (including GST/HST/PST for Canadian residents) are added to your subscription fee at the prevailing rate.
                            </p>
                        </div>

                        {/* Acceptable Use */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">4. Acceptable Use Policy</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">You agree to use Ogeemo only for lawful purposes. You will NOT:</p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>Use the platform to store, process, or transmit data that is illegal under Canadian or applicable international law</li>
                                <li>Attempt to gain unauthorized access to other members' data, our systems, or our infrastructure</li>
                                <li>Use the platform to engage in fraud, money laundering, or any financial crime</li>
                                <li>Reverse engineer, decompile, or attempt to extract the source code of the platform</li>
                                <li>Use bots, scrapers, or automated tools to access the platform outside of our provided API</li>
                                <li>Share your account credentials with non-members or allow non-paying users to access the platform through your account</li>
                                <li>Upload malware, viruses, or malicious code</li>
                                <li>Use the platform to send spam or unsolicited commercial communications</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                Violation of this policy may result in immediate account suspension or termination without refund.
                            </p>
                        </div>

                        {/* Member Data and Ownership */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">5. Member Data and Ownership</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>You own your data.</strong> All business data you enter into Ogeemo — including contacts, transactions, invoices, payroll records, documents, and project information — remains your property. Ogeemo does not claim ownership of your business data.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                You grant Ogeemo a limited license to process your data solely for the purpose of providing the platform's services to you. This includes storing, displaying, and processing your data within the platform, and using AI services to provide features like search and automation.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>Data Portability.</strong> You may export your data at any time using the platform's built-in backup and export tools. We do not charge fees for exporting your own data. If you cancel your subscription, you retain read-only access for 30 days to complete your export.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>Accounting Accuracy.</strong> While Ogeemo provides accounting tools, you are responsible for the accuracy of the data you enter. Ogeemo is a tool, not a replacement for a licensed CPA. For complex tax situations, consult a qualified professional.
                            </p>
                        </div>

                        {/* Intellectual Property */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">6. Intellectual Property</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                The Ogeemo platform, including its software, design, branding, logos, content, and features, is the intellectual property of Ogeemo Inc. and is protected by Canadian and international copyright, trademark, and patent laws.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                You may not:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>Copy, modify, or distribute the platform's source code or design elements</li>
                                <li>Use the Ogeemo name, logo, or branding without written permission</li>
                                <li>Create derivative works based on the platform</li>
                                <li>Remove or alter any copyright, trademark, or proprietary notices</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                Your business data, custom configurations, and uploaded content remain your intellectual property.
                            </p>
                        </div>

                        {/* Mentor Marketplace */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <Users className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">7. Mentor Marketplace</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                Ogeemo may offer a Mentor Marketplace where members can engage Certified Mentors (vetted CPAs, lawyers, bookkeepers, and business consultants) for paid consulting services. The following terms apply:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li><strong>Platform Role:</strong> Ogeemo facilitates the connection between members and mentors but is not a party to the consulting agreement. Mentors are independent contractors, not employees of Ogeemo.</li>
                                <li><strong>Commission:</strong> Ogeemo charges a platform commission of 10–20% on transactions processed through the marketplace. The exact rate is displayed before booking.</li>
                                <li><strong>Quality Assurance:</strong> Certified Mentors are vetted through a peer-review process. However, Ogeemo does not guarantee the outcome of any consulting engagement.</li>
                                <li><strong>Disputes:</strong> If you are dissatisfied with a mentor engagement, Ogeemo provides a mediation protocol. Contact clients@ogeemo.com to initiate mediation.</li>
                            </ul>
                        </div>

                        {/* Free Trial */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">8. Free Trial</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                New members may be offered a 30-day free trial of the Ogeemo Suite. During the trial:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>You have access to the full platform with no feature restrictions</li>
                                <li>No credit card is required to start the trial</li>
                                <li>Your data is fully exportable during and after the trial</li>
                                <li>If you do not convert to a paid membership within 30 days, your account will be deactivated and your data will be subject to our data retention policy (see Privacy Policy, Section 9)</li>
                            </ul>
                        </div>

                        {/* Limitation of Liability */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">9. Limitation of Liability</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                Ogeemo is provided "as is" and "as available." While we are committed to building a reliable, audit-ready platform, we cannot guarantee uninterrupted service. To the maximum extent permitted by law:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>Ogeemo Inc. shall not be liable for indirect, incidental, special, consequential, or punitive damages</li>
                                <li>Our total liability for any claim arising from these Terms or your use of the platform shall not exceed the amount you paid in the 12 months preceding the claim</li>
                                <li>We are not liable for data loss caused by your failure to maintain backups, though we provide backup tools and recommend their use</li>
                                <li>We are not liable for financial decisions made based on data you enter into the platform</li>
                                <li>We are not liable for the actions or advice of Certified Mentors engaged through the marketplace</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                This limitation does not apply to liability that cannot be excluded under applicable law, including liability for gross negligence, willful misconduct, or fraud.
                            </p>
                        </div>

                        {/* Indemnification */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">10. Indemnification</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                You agree to indemnify and hold harmless Ogeemo Inc., its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>Your violation of these Terms</li>
                                <li>Your violation of applicable laws or regulations</li>
                                <li>Your misuse of the platform</li>
                                <li>Claims that your data or content infringes the rights of a third party</li>
                            </ul>
                        </div>

                        {/* Termination */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">11. Termination</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>By You:</strong> You may cancel your subscription at any time. Cancellation takes effect at the end of your current billing cycle. No cancellation fees apply. Your data remains accessible for 30 days after cancellation for export purposes.
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>By Us:</strong> We may suspend or terminate your account if:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>You violate these Terms or our Acceptable Use Policy</li>
                                <li>Your subscription payment remains unresolved after the 15-day grace period</li>
                                <li>Your account is inactive for more than 12 consecutive months</li>
                                <li>We are required to do so by law</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                Upon termination, we will provide you with a reasonable opportunity to export your data. After the 30-day post-termination window, your data will be permanently deleted in accordance with our Privacy Policy.
                            </p>
                        </div>

                        {/* Dispute Resolution */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <Gavel className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">12. Dispute Resolution</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                We believe in resolving disputes like professionals, not adversaries. If a dispute arises:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li><strong>Step 1 — Direct Contact:</strong> Contact us at clients@ogeemo.com. We commit to responding within 5 business days.</li>
                                <li><strong>Step 2 — Mediation:</strong> If direct contact does not resolve the issue, we will engage in good-faith mediation through a mutually agreed-upon mediator.</li>
                                <li><strong>Step 3 — Arbitration:</strong> If mediation fails, disputes will be resolved through binding arbitration in Vancouver, BC, under the laws of British Columbia and Canada. The arbitrator's decision is final and binding.</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                <strong>Class Action Waiver.</strong> You agree that any dispute will be resolved individually, not as part of a class action.
                            </p>
                        </div>

                        {/* Governing Law */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                    <Scale className="h-5 w-5" />
                                </div>
                                <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">13. Governing Law</h2>
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                These Terms are governed by the laws of the Province of British Columbia and the federal laws of Canada. Any legal action arising from these Terms shall be brought in the courts of British Columbia, Canada.
                            </p>
                        </div>

                        {/* Changes to Terms */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">14. Changes to These Terms</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We may update these Terms from time to time. When we do, we will:
                            </p>
                            <ul className="space-y-3 text-muted-foreground leading-relaxed pl-6 list-disc">
                                <li>Update the "Last updated" date at the top of this page</li>
                                <li>Notify active members of material changes via email at least 30 days before they take effect</li>
                                <li>Never change the Price Lock Guarantee for existing members — your locked rate is your locked rate</li>
                            </ul>
                            <p className="text-muted-foreground leading-relaxed">
                                Continued use of the platform after changes take effect constitutes acceptance of the updated Terms.
                            </p>
                        </div>

                        {/* Contact */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold font-headline text-primary tracking-tight">15. Contact Us</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                If you have questions about these Terms, please contact us:
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
                        <h2 className="text-3xl md:text-4xl font-bold font-headline tracking-tight">Fair terms. Locked price. No traps.</h2>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">Join a platform that treats you as a partner, not a target.</p>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}