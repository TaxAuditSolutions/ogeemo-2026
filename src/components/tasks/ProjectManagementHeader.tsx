
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Briefcase, ListChecks, Info } from 'lucide-react';

export function ProjectManagementHeader() {
    const pathname = usePathname();
    
    const navLinks = [
        { href: "/projects/all", label: "Project List", icon: Briefcase },
        { href: "/project-status", label: "Project Status", icon: ListChecks },
    ];
    
    return (
        <div className="flex justify-center items-center gap-2">
            {navLinks.map(link => (
                <Button key={link.href} asChild variant={pathname === link.href ? 'default' : 'outline'}>
                    <Link href={link.href}>
                        <link.icon className="mr-2 h-4 w-4" /> {link.label}
                    </Link>
                </Button>
            ))}
             <Button asChild variant="ghost" size="icon">
                <Link href="/projects/instructions">
                    <Info className="h-5 w-5" />
                    <span className="sr-only">Project Management Instructions</span>
                </Link>
            </Button>
        </div>
    );
}
