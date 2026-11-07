'use client';

import * as React from 'react';

import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { type Event as TaskEvent, type Project } from '@/types/calendar-types';
import { getProjects, getTasksForUser } from '@/services/project-service';
import { getContacts, type Contact } from '@/services/contact-service';
import { ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/core/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { getWorkers, type Worker } from '@/services/payroll-service';

/**
 * Lists the activity form's pickers (client, project, assignee) and the
 * "Add new contact" dialog draw from. Shared by the Activity Manager page and
 * the Calendar's Add dialog. Pass `enabled = false` to defer loading (e.g.
 * until a dialog first opens); data is fetched once per signed-in user.
 */
export function useActivityReferenceData(enabled: boolean = true) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [projects, setProjects] = React.useState<Project[]>([]);
    const [contacts, setContacts] = React.useState<Contact[]>([]);
    const [contactFolders, setContactFolders] = React.useState<FolderData[]>([]);
    const [companies, setCompanies] = React.useState<Company[]>([]);
    const [customIndustries, setCustomIndustries] = React.useState<Industry[]>([]);
    const [workers, setWorkers] = React.useState<Worker[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const loadedForUserRef = React.useRef<string | null>(null);

    // The user's calendar, used to suggest the next free time slot. Unlike the
    // pickers above it is re-read every time the form is enabled, because the
    // calendar changes between visits. A failed read just means no suggestion.
    const [events, setEvents] = React.useState<TaskEvent[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = React.useState(true);

    const reloadEvents = React.useCallback(async () => {
        if (!user) {
            setIsLoadingEvents(false);
            return;
        }
        try {
            setEvents(await getTasksForUser(user.uid));
        } catch (error) {
            console.error('Failed to load calendar for next free slot:', error);
        } finally {
            setIsLoadingEvents(false);
        }
    }, [user]);

    React.useEffect(() => {
        if (!enabled) {
            setIsLoadingEvents(true);
            return;
        }
        setIsLoadingEvents(true);
        void reloadEvents();
    }, [enabled, reloadEvents]);

    React.useEffect(() => {
        if (!enabled) return;
        if (!user) {
            setIsLoading(false);
            return;
        }
        if (loadedForUserRef.current === user.uid) {
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        (async () => {
            try {
                const [proj, cont, fold, comp, ind, wrks] = await Promise.all([
                    getProjects(user.uid),
                    getContacts(),
                    ensureSystemFolders(user.uid),
                    getCompanies(user.uid),
                    getIndustries(user.uid),
                    getWorkers(user.uid),
                ]);
                if (cancelled) return;
                loadedForUserRef.current = user.uid;
                setProjects(proj);
                setContacts(cont);
                setContactFolders(fold);
                setCompanies(comp);
                setCustomIndustries(ind);
                setWorkers(wrks);
            } catch (error: any) {
                if (!cancelled) toast({ variant: 'destructive', title: 'Error', description: error.message });
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [enabled, user, toast]);

    return {
        projects,
        setProjects,
        contacts,
        setContacts,
        contactFolders,
        setContactFolders,
        companies,
        setCompanies,
        customIndustries,
        setCustomIndustries,
        workers,
        isLoading,
        events,
        isLoadingEvents,
        reloadEvents,
    };
}

export type ActivityReferenceData = ReturnType<typeof useActivityReferenceData>;
