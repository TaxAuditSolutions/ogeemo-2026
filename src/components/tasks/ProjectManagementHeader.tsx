
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Briefcase, ListChecks, Info, ListTodo } from 'lucide-react';
import { NewTaskDialog } from './NewTaskDialog';
import { useAuth } from '@/context/auth-context';
import { addProject } from '@/services/project-service';
import { type Project, type Event as TaskEvent } from '@/types/calendar-types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getContacts, type Contact } from '@/services/contact-service';

export function ProjectManagementHeader() {
    const router = useRouter();
    const pathname = usePathname();
    
    const navLinks = [
        { href: "/projects/all", label: "Project List", icon: Briefcase },
        { href: "/project-status", label: "Project Status", icon: ListChecks },
        { href: "/all-project-tasks", label: "All Tasks", icon: ListTodo },
    ];
    
    return (
        <div className="flex justify-center gap-2 pb-4">
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
