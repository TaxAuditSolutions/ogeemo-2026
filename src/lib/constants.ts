
import { Users, Briefcase, Newspaper, MessageSquare, Info, FileText, ShieldCheck } from "lucide-react";

/**
 * @fileOverview Global constants for the Ogeemo ecosystem.
 * Hard-coded to prevent feature creep and maintain the KISS philosophy.
 */

export const MEMBERSHIP_FEE = 25.00;

export const navLinks = [
    { href: "/for-small-businesses", label: "For Small Businesses", icon: Users },
    { href: "/for-consultants", label: "For Consultants", icon: Briefcase },
    { href: "/about", label: "About Us", icon: Info },
    { href: "/contact", label: "Contact", icon: MessageSquare },
    { href: "/privacy", label: "Privacy Policy", icon: FileText },
    { href: "/terms", label: "Terms of Service", icon: ShieldCheck },
];
