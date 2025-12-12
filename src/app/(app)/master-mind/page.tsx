
'use client';

import { TimeManagerView } from '@/components/time/time-manager-view';
import { getProjects } from '@/services/project-service';
import { getContacts } from '@/services/contact-service';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import type { Contact } from '@/data/contacts';
import type { Project } from '@/types/calendar-types';
import { LoaderCircle } from 'lucide-react';

export default function MasterMindPage() {
    const { user } = useAuth();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (user) {
                try {
                    const [contactData, projectData] = await Promise.all([
                        getContacts(user.uid),
                        getProjects(user.uid),
                    ]);
                    setContacts(contactData);
                    setProjects(projectData);
                } catch (error) {
                    console.error("Failed to load initial data for Master Mind:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                 setIsLoading(false);
            }
        }
        loadData();
    }, [user]);

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
  
  return <TimeManagerView projects={projects} contacts={contacts} />;
}

    