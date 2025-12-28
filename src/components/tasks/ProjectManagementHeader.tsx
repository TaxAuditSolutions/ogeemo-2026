
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Briefcase, ListChecks, Info, Plus, ListTodo, Route } from 'lucide-react';
import { NewTaskDialog } from './NewTaskDialog';
import { useAuth } from '@/context/auth-context';
import { addProject } from '@/services/project-service';
import { type Project, type Event as TaskEvent } from '@/types/calendar-types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getContacts, type Contact } from '@/services/contact-service';

export function ProjectManagementHeader() {
    return (
        <div className="flex justify-center gap-2 pb-4">
            <Button asChild variant="outline">
                <Link href="/projects">
                    <Briefcase className="mr-2 h-4 w-4" /> Project Hub
                </Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/projects/all">
                    <Briefcase className="mr-2 h-4 w-4" /> Project List
                </Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/project-status">
                    <ListChecks className="mr-2 h-4 w-4" /> Status Board
                </Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/all-project-tasks">
                    <ListTodo className="mr-2 h-4 w-4" /> All Tasks
                </Link>
            </Button>
             <Button asChild variant="ghost" size="icon">
                <Link href="/projects/instructions">
                    <Info className="h-5 w-5" />
                    <span className="sr-only">Project Management Instructions</span>
                </Link>
            </Button>
        </div>
    );
}
