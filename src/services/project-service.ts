
'use client';

import {
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    writeBatch,
    Timestamp,
    setDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { type Project, type Event as TaskEvent, type ProjectTemplate, type TaskStatus, type ProjectStep, type ActionChipData, type ProjectStatus } from '@/types/calendar-types';
export type { Project, ProjectStep, ProjectTemplate, TaskStatus, ActionChipData, ProjectStatus, Event } from '@/types/calendar-types';
import { Mail, Briefcase, ListTodo, Calendar, Clock, Contact, Beaker, Calculator, Folder, Wand2, MessageSquare, HardHat, Contact2, Share2, Users2, PackageSearch, Megaphone, Landmark, DatabaseBackup, BarChart3, HeartPulse, Bell, Bug, Database, FilePlus2, LogOut, Settings, Lightbulb, Info, BrainCircuit, GitMerge, Pencil, ListChecks, FilePenLine, Route, Link as LinkIcon, FileDigit, FileOutput, ListPlus, TrendingUp, TrendingDown, BookText, ShieldCheck, WalletCards, UserPlus, Banknote, Percent, FileSignature, FileInput, Activity, Wrench, Users, ArrowDownAZ, ArrowUpZA } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { accountingMenuItems } from '@/data/accounting-menu-items';
import hrMenuItems from '@/data/hr-menu-items';
import { allMenuItems } from '@/lib/menu-items';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const PROJECTS_COLLECTION = 'projects';
const TASKS_COLLECTION = 'tasks';
const TEMPLATES_COLLECTION = 'projectTemplates';
const FOLDERS_COLLECTION = 'projectFolders';
const ACTION_CHIPS_COLLECTION = 'userActionChips';
const AVAILABLE_ACTION_CHIPS_COLLECTION = 'availableActionChips';
const TRASHED_ACTION_CHIPS_COLLECTION = 'trashedActionChips';
const ACCOUNTING_QUICK_NAV_ITEMS_COLLECTION = 'accountingQuickNavItems';
const AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION = 'availableAccountingNavItems';
const HR_QUICK_NAV_ITEMS_COLLECTION = 'hrQuickNavItems';
const AVAILABLE_HR_NAV_ITEMS_COLLECTION = 'availableHrNavItems';

const defaultChips: Omit<ActionChipData, 'id' | 'userId'>[] = [
    { label: 'OgeeMail', icon: Mail, href: '/ogeemail' },
    { label: 'Contacts Hub', icon: Contact, href: '/contacts' },
    { label: 'Projects', icon: Briefcase, href: '/projects/all' },
    { label: 'Command Centre', icon: BrainCircuit, href: '/master-mind' },
];

const iconMap: { [key: string]: LucideIcon } = {
    Mail, Briefcase, ListTodo, Calendar, Clock, Contact, Beaker, Calculator, Folder, Wand2, MessageSquare, HardHat, Contact2, Share2, Users2, PackageSearch, Megaphone, Landmark, DatabaseBackup, BarChart3, HeartPulse, Bell, Bug, Database, FilePlus2, LogOut, Settings, Lightbulb, Info, BrainCircuit, GitMerge, Pencil, ListChecks, FilePenLine, Route, LinkIcon,
    FileDigit, FileOutput, ListPlus, TrendingUp, TrendingDown, BookText, ShieldCheck, WalletCards, UserPlus, Banknote, Percent, FileSignature, FileInput, Activity, Wrench, Users, ArrowDownAZ, ArrowUpZA
};

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

function getCurrentAuthContext() {
    const { auth } = getFirebaseServices();
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error('User must be logged in.');
    }
    return currentUser;
}

async function getCurrentOrgId(): Promise<string> {
    const currentUser = getCurrentAuthContext();
    const tokenResult = await currentUser.getIdTokenResult();
    const claimedOrgId = tokenResult.claims.orgId;
    if (typeof claimedOrgId === 'string' && claimedOrgId.trim()) {
        return claimedOrgId;
    }

    const db = getDb();
    const userProfileRef = doc(db, 'users', currentUser.uid);
    const userProfileSnap = await getDoc(userProfileRef);
    const profileOrgId = userProfileSnap.data()?.orgId;
    if (typeof profileOrgId === 'string' && profileOrgId.trim()) {
        return profileOrgId;
    }

    throw new Error('Authenticated user is missing an orgId claim and profile orgId.');
}

function toClientDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') return value.toDate();
    return undefined;
}

function toFirestoreDateValue(value: any): Date | null {
    if (value === null) return null;
    if (!value) return null;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
}

const docToProject = (doc: any): Project => {
    const data = doc.data();
    if (!data) throw new Error("Document data is missing.");
    return {
        id: doc.id,
        orgId: data.orgId,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        name: data.name,
        description: data.description || '',
        clientId: data.clientId || null,
        contactId: data.contactId || null,
        userId: data.userId,
        createdAt: toClientDate(data.createdAt),
        updatedAt: toClientDate(data.updatedAt),
        steps: (data.steps || []).map((step: any) => ({
            ...step,
            startTime: toClientDate(step.startTime) || null,
        })),
        status: data.status || 'planning',
        urgency: data.urgency || 'important',
        importance: data.importance || 'B',
        projectManagerId: data.projectManagerId || null,
        startDate: toClientDate(data.startDate) || null,
        endDate: toClientDate(data.endDate) || null,
        projectValue: data.projectValue || null,
    };
};

const docToTask = (doc: any): TaskEvent => {
    const data = doc.data();
    if (!data) throw new Error("Document data is missing.");
    return {
        id: doc.id,
        orgId: data.orgId,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        createdAt: toClientDate(data.createdAt),
        updatedAt: toClientDate(data.updatedAt),
        title: data.title,
        description: data.description || '',
        start: toClientDate(data.start),
        end: toClientDate(data.end),
        status: data.status || 'todo',
        position: data.position || 0,
        projectId: data.projectId || null,
        stepId: data.stepId || null,
        userId: data.userId,
        attendees: data.attendees,
        contactId: data.contactId || null,
        workerId: data.workerId || null,
        isScheduled: data.isScheduled || false,
        isTodoItem: data.isTodoItem || false,
        duration: data.duration,
        isBillable: data.isBillable,
        billableRate: data.billableRate,
        sessions: (data.sessions || []).map((session: any) => ({
            ...session,
            startTime: toClientDate(session.startTime) || new Date(),
            endTime: toClientDate(session.endTime) || new Date(),
        })),
        urgency: data.urgency,
        importance: data.importance,
        ritualType: data.ritualType,
        workOrderId: data.workOrderId || null,
    };
};

const docToTemplate = (doc: any): ProjectTemplate => ({ id: doc.id, ...doc.data() } as ProjectTemplate);

const docToActionChip = (doc: any): ActionChipData => {
    const data = doc.data ? doc.data() : doc;
    const iconName = data.iconName || (data.icon ? (data.icon as any).displayName || (data.icon as any).name : 'Wand2');
    return {
        id: doc.id || data.id,
        ...data,
        icon: iconMap[iconName] || Wand2,
    } as ActionChipData;
};

async function updateChipsInCollection(userId: string, collectionName: string, chips: ActionChipData[]): Promise<void> {
    const db = getDb();
    const docRef = doc(db, collectionName, userId);

    const validChips = (chips || []).filter(c => c && typeof c === 'object' && c.id);

    const serializedChips = validChips.map(chip => {
        const iconSource = chip.icon as any;
        const iconName = iconSource?.displayName || iconSource?.name || 'Wand2';
        return {
            id: chip.id,
            label: chip.label,
            href: chip.href,
            userId: chip.userId || userId,
            iconName: iconName
        };
    });
    await setDoc(docRef, { chips: serializedChips }, { merge: true });
}

export async function getChipsFromCollection(userId: string, collectionName: string): Promise<ActionChipData[]> {
    const db = getDb();
    const docRef = doc(db, collectionName, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return (data.chips || []).map((chip: any) => docToActionChip(chip));
    }
    return [];
}

export async function getProjects(userId: string): Promise<Project[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const q = query(collection(db, PROJECTS_COLLECTION), where("orgId", "==", orgId));
    const snapshot = await getDocs(q);
    return snapshot.docs
        .map(docToProject)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    if (!projectId || projectId === 'inbox') return null;
    const db = getDb();
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
        const project = docToProject(projectSnap);
        return project.orgId === await getCurrentOrgId() ? project : null;
    }
    return null;
}

export async function addProject(projectData: Omit<Project, 'id'>): Promise<Project> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const dataToSave = {
        ...projectData,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: projectData.createdAt || new Date(),
        updatedAt: new Date(),
        startDate: toFirestoreDateValue(projectData.startDate),
        endDate: toFirestoreDateValue(projectData.endDate),
        contactId: projectData.contactId || null,
        description: projectData.description || '',
        status: projectData.status || 'planning',
        urgency: projectData.urgency || 'important',
        importance: projectData.importance || 'B',
        projectManagerId: projectData.projectManagerId || null,
        projectValue: projectData.projectValue || null,
        steps: projectData.steps || [],
    };
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), dataToSave);
    return docToProject({ id: docRef.id, data: () => dataToSave });
}

export async function updateProject(projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const currentSnap = await getDoc(projectRef);
    if (!currentSnap.exists()) return;
    if (currentSnap.data().orgId !== orgId) return;

    const updatedData: any = {
        ...projectData,
        orgId,
        updatedBy: currentUser.uid,
        updatedAt: new Date(),
    };
    if ('startDate' in updatedData) {
        updatedData.startDate = toFirestoreDateValue(updatedData.startDate);
    }
    if ('endDate' in updatedData) {
        updatedData.endDate = toFirestoreDateValue(updatedData.endDate);
    }

    await updateDoc(projectRef, updatedData);
}

export async function deleteProject(projectId: string, taskIds: string[]): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const batch = writeBatch(db);
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists() || projectSnap.data().orgId !== orgId) return;

    const tasksSnapshot = await getDocs(query(collection(db, TASKS_COLLECTION), where('orgId', '==', orgId), where('projectId', '==', projectId)));
    tasksSnapshot.forEach(taskDoc => batch.delete(taskDoc.ref));

    taskIds.forEach(taskId => {
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        batch.delete(taskRef);
    });

    batch.delete(projectRef);
    await batch.commit();
}

export async function deleteProjects(projectIds: string[]): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const batch = writeBatch(db);
    for (const projectId of projectIds) {
        const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
        const projectSnap = await getDoc(projectRef);
        if (!projectSnap.exists() || projectSnap.data().orgId !== orgId) continue;
        batch.delete(projectRef);
        const tasksQuery = query(collection(db, TASKS_COLLECTION), where("orgId", "==", orgId), where("projectId", "==", projectId));
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.forEach(taskDoc => {
            batch.delete(taskDoc.ref);
        });
    }
    await batch.commit();
}

/**
 * Fetches tasks for a specific project.
 * @param userId Optional. Filters by owner if provided.
 * @param projectId The target project ID.
 */
export async function getTasksForProject(userId: string | undefined, projectId: string): Promise<TaskEvent[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const collectionRef = collection(db, TASKS_COLLECTION);
    let q;
    if (projectId === 'inbox' || !projectId) {
        q = query(collectionRef, where('orgId', '==', orgId), where("projectId", "==", null));
    } else {
        q = query(collectionRef, where('orgId', '==', orgId), where("projectId", "==", projectId));
    }

    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToTask);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: TASKS_COLLECTION,
                operation: 'list',
            } satisfies SecurityRuleContext));
        }
        throw error;
    }
}

export async function getTaskById(taskId: string): Promise<TaskEvent | null> {
    const db = getDb();
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
        const task = docToTask(taskSnap);
        return task.orgId === await getCurrentOrgId() ? task : null;
    }
    return null;
}

/**
 * Fetches all tasks for a user or organization.
 * @param userId Optional. If provided, restricts to owner. Otherwise relies on Security Rules for access.
 */
export async function getTasksForUser(userId?: string): Promise<TaskEvent[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const collectionRef = collection(db, TASKS_COLLECTION);
    const q = query(collectionRef, where('orgId', '==', orgId));

    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToTask);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: TASKS_COLLECTION,
                operation: 'list',
            } satisfies SecurityRuleContext));
        }
        throw error;
    }
}

export async function addTask(taskData: Omit<TaskEvent, 'id'>): Promise<TaskEvent> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const dataToSave = {
        ...taskData,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: taskData.createdAt || new Date(),
        updatedAt: new Date(),
        start: toFirestoreDateValue(taskData.start),
        end: toFirestoreDateValue(taskData.end),
        isScheduled: taskData.isScheduled || false,
    };
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), dataToSave);
    const newTaskId = docRef.id;
    if (dataToSave.projectId && dataToSave.projectId !== 'inbox' && !dataToSave.stepId) {
        const projectRef = doc(db, PROJECTS_COLLECTION, dataToSave.projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
            const projectData = docToProject(projectSnap);
            const stepId = `step_${newTaskId}`;
            const existingStep = (projectData.steps || []).find(step => step?.id === stepId);
            if (!existingStep) {
                const newStep: Partial<ProjectStep> = {
                    id: stepId,
                    title: dataToSave.title,
                    description: dataToSave.description || '',
                    isCompleted: dataToSave.status === 'done',
                };
                const updatedSteps = [...(projectData.steps || []), newStep];
                await updateDoc(projectRef, { steps: updatedSteps });
                await updateDoc(docRef, { stepId: stepId });
                return docToTask({ id: newTaskId, data: () => ({ ...dataToSave, stepId }) });
            }
        }
    }
    return docToTask({ id: newTaskId, data: () => dataToSave });
}

export async function updateTask(taskId: string, taskData: Partial<Omit<TaskEvent, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    if (!taskSnap.exists() || taskSnap.data().orgId !== orgId) return;
    const dataToUpdate = { ...taskData };
    if ('projectId' in dataToUpdate && dataToUpdate.projectId === undefined) {
        dataToUpdate.projectId = null;
    }
    if ('start' in dataToUpdate) {
        (dataToUpdate as any).start = toFirestoreDateValue((dataToUpdate as any).start);
    }
    if ('end' in dataToUpdate) {
        (dataToUpdate as any).end = toFirestoreDateValue((dataToUpdate as any).end);
    }
    (dataToUpdate as any).orgId = orgId;
    (dataToUpdate as any).updatedBy = currentUser.uid;
    (dataToUpdate as any).updatedAt = new Date();
    await updateDoc(taskRef, dataToUpdate);
}

export async function updateTaskPositions(tasksToUpdate: { id: string; position: number; status: TaskStatus }[]): Promise<void> {
    const db = getDb();
    const batch = writeBatch(db);
    tasksToUpdate.forEach(task => {
        const taskRef = doc(db, TASKS_COLLECTION, task.id);
        batch.update(taskRef, { position: task.position, status: task.status });
    });
    await batch.commit();
}

export async function deleteTask(taskId: string): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
        const taskData = docToTask(taskSnap);
        if (taskData.orgId !== orgId) return;
        if (taskData.projectId && taskData.projectId !== 'inbox' && taskData.stepId) {
            const projectRef = doc(db, PROJECTS_COLLECTION, taskData.projectId);
            const projectSnap = await getDoc(projectRef);
            if (projectSnap.exists()) {
                const projectData = docToProject(projectSnap);
                const updatedSteps = (projectData.steps || []).filter(step => step.id !== taskData.stepId);
                await updateDoc(projectRef, { steps: updatedSteps });
            }
        }
    }
    await deleteDoc(taskRef);
}

export async function deleteTodos(todoIds: string[]): Promise<void> {
    if (todoIds.length === 0) return;
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const batch = writeBatch(db);
    for (const id of todoIds) {
        const docRef = doc(db, TASKS_COLLECTION, id);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().orgId === orgId) {
            batch.delete(docRef);
        }
    }
    await batch.commit();
}

export async function getProjectTemplates(_userId: string): Promise<ProjectTemplate[]> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const q = query(collection(db, TEMPLATES_COLLECTION), where('orgId', '==', orgId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToTemplate);
}

export async function addProjectTemplate(templateData: Omit<ProjectTemplate, 'id'>): Promise<ProjectTemplate> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const dataToSave = {
        ...templateData,
        orgId,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), dataToSave);
    return { id: docRef.id, ...templateData };
}

export async function updateProjectTemplate(templateId: string, templateData: Partial<Omit<ProjectTemplate, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const currentUser = getCurrentAuthContext();
    const orgId = await getCurrentOrgId();
    const templateRef = doc(db, TEMPLATES_COLLECTION, templateId);
    const templateSnap = await getDoc(templateRef);
    if (!templateSnap.exists() || templateSnap.data().orgId !== orgId) return;

    await updateDoc(templateRef, {
        ...templateData,
        orgId,
        updatedBy: currentUser.uid,
        updatedAt: new Date(),
    });
}

export async function deleteProjectTemplate(templateId: string): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const templateRef = doc(db, TEMPLATES_COLLECTION, templateId);
    const templateSnap = await getDoc(templateRef);
    if (!templateSnap.exists() || templateSnap.data().orgId !== orgId) return;
    await deleteDoc(templateRef);
}

export async function getActionChips(userId: string, type: string = 'dashboard'): Promise<ActionChipData[]> {
    if (!userId) return [];
    const collectionNameMap: Record<string, string> = {
        dashboard: ACTION_CHIPS_COLLECTION,
        accounting: ACCOUNTING_QUICK_NAV_ITEMS_COLLECTION,
        hr: HR_QUICK_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type] || ACTION_CHIPS_COLLECTION;
    const db = getDb();
    const docRef = doc(db, collectionName, userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        const defaultSourceMap: Record<string, any[]> = {
            dashboard: defaultChips,
            accounting: accountingMenuItems.slice(0, 4),
            hr: hrMenuItems,
        };
        const defaultSource = defaultSourceMap[type] || defaultChips;
        return defaultSource.map((c) => ({
            ...c,
            id: `default-${typeof c.href === 'string' ? c.href : (c.href as any).pathname}`,
            userId
        })) as ActionChipData[];
    }
    return getChipsFromCollection(userId, collectionName);
}

export async function getAvailableActionChips(userId: string, type: string = 'dashboard'): Promise<ActionChipData[]> {
    if (!userId) return [];
    const collectionNameMap: Record<string, string> = {
        dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
        accounting: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
        hr: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type] || AVAILABLE_ACTION_CHIPS_COLLECTION;
    const userActionChips = await getActionChips(userId, type);
    const usedHrefs = new Set(userActionChips.map(c => typeof c.href === 'string' ? c.href : (c.href as any).pathname));

    const db = getDb();
    const docRef = doc(db, collectionName, userId);
    const docSnap = await getDoc(docRef);

    // Helper to get defaults not in used list
    const getDefaultsNotUsed = (type: string, used: Set<string>) => {
        const defaultSourceMap: Record<string, any[]> = {
            dashboard: allMenuItems,
            accounting: accountingMenuItems,
            hr: hrMenuItems,
        };
        const defaultSource = defaultSourceMap[type] || allMenuItems;
        return defaultSource
            .filter(item => !used.has(item.href))
            .map(item => ({ ...item, id: `default-${item.href}`, userId }));
    };

    const defaultsNotUsed = getDefaultsNotUsed(type, usedHrefs);

    if (!docSnap.exists()) {
        return defaultsNotUsed as ActionChipData[];
    }

    const customAvailable = await getChipsFromCollection(userId, collectionName);
    const filteredCustomAvailable = customAvailable.filter(item => !usedHrefs.has(typeof item.href === 'string' ? item.href : (item.href as any).pathname));

    const combined = [...filteredCustomAvailable];
    const customHrefs = new Set(filteredCustomAvailable.map(c => typeof c.href === 'string' ? c.href : (c.href as any).pathname));

    defaultsNotUsed.forEach(item => {
        if (!customHrefs.has(item.href)) {
            combined.push(item as any);
        }
    });

    return combined.sort((a, b) => a.label.localeCompare(b.label));
}

export async function updateActionChips(userId: string, chips: ActionChipData[], type: string = 'dashboard'): Promise<void> {
    const collectionNameMap: Record<string, string> = {
        dashboard: ACTION_CHIPS_COLLECTION,
        accounting: ACCOUNTING_QUICK_NAV_ITEMS_COLLECTION,
        hr: HR_QUICK_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type] || ACTION_CHIPS_COLLECTION;
    await updateChipsInCollection(userId, collectionName, chips);
}

export async function updateAvailableActionChips(userId: string, chips: ActionChipData[], type: string = 'dashboard'): Promise<void> {
    const collectionNameMap: Record<string, string> = {
        dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
        accounting: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
        hr: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type] || AVAILABLE_ACTION_CHIPS_COLLECTION;
    await updateChipsInCollection(userId, collectionName, chips);
}

export async function addActionChip(data: Omit<ActionChipData, 'id'>, type: string = 'dashboard'): Promise<ActionChipData> {
    const collectionNameMap: Record<string, string> = {
        dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
        accounting: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
        hr: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type] || AVAILABLE_ACTION_CHIPS_COLLECTION;

    const currentAvailable = await getChipsFromCollection(data.userId, collectionName);

    const newChip: ActionChipData = {
        ...data,
        id: `custom-${Date.now()}`
    };

    await updateChipsInCollection(data.userId, collectionName, [...currentAvailable, newChip]);
    return newChip;
}

export async function trashActionChips(userId: string, chips: ActionChipData[], type: string = 'dashboard'): Promise<void> {
    const collectionNameMap: Record<string, string> = {
        dashboard: ACTION_CHIPS_COLLECTION,
        accounting: ACCOUNTING_QUICK_NAV_ITEMS_COLLECTION,
        hr: HR_QUICK_NAV_ITEMS_COLLECTION,
    };
    const availableCollectionNameMap: Record<string, string> = {
        dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
        accounting: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
        hr: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
    };

    const collectionName = collectionNameMap[type] || ACTION_CHIPS_COLLECTION;
    const availableCollectionName = availableCollectionNameMap[type] || AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION;

    const [currentChips, currentAvailable, currentTrashed] = await Promise.all([
        getChipsFromCollection(userId, collectionName),
        getChipsFromCollection(userId, availableCollectionName),
        getChipsFromCollection(userId, TRASHED_ACTION_CHIPS_COLLECTION)
    ]);

    const chipIdsToTrash = new Set(chips.map(c => c.id));

    const newChips = currentChips.filter(c => !chipIdsToTrash.has(c.id));
    const newAvailable = currentAvailable.filter(c => !chipIdsToTrash.has(c.id));
    const newTrashed = [...currentTrashed, ...chips];

    await Promise.all([
        updateChipsInCollection(userId, collectionName, newChips),
        updateChipsInCollection(userId, availableCollectionName, newAvailable),
        updateChipsInCollection(userId, TRASHED_ACTION_CHIPS_COLLECTION, newTrashed)
    ]);
}

export async function getTrashedActionChips(userId: string): Promise<ActionChipData[]> {
    if (!userId) return [];
    return getChipsFromCollection(userId, TRASHED_ACTION_CHIPS_COLLECTION);
}

export async function restoreActionChips(userId: string, chips: ActionChipData[]): Promise<void> {
    const currentAvailable = await getChipsFromCollection(userId, AVAILABLE_ACTION_CHIPS_COLLECTION);
    const currentTrashed = await getChipsFromCollection(userId, TRASHED_ACTION_CHIPS_COLLECTION);

    const chipIdsToRestore = new Set(chips.map(c => c.id));

    const newAvailable = [...currentAvailable, ...chips];
    const newTrashed = currentTrashed.filter(c => !chipIdsToRestore.has(c.id));

    await Promise.all([
        updateChipsInCollection(userId, AVAILABLE_ACTION_CHIPS_COLLECTION, newAvailable),
        updateChipsInCollection(userId, TRASHED_ACTION_CHIPS_COLLECTION, newTrashed)
    ]);
}

export async function deleteActionChips(userId: string, chipIds: string[]): Promise<void> {
    const currentTrashed = await getChipsFromCollection(userId, TRASHED_ACTION_CHIPS_COLLECTION);
    const chipIdsToDelete = new Set(chipIds);
    const newTrashed = currentTrashed.filter(c => !chipIdsToDelete.has(c.id));
    await updateChipsInCollection(userId, TRASHED_ACTION_CHIPS_COLLECTION, newTrashed);
}

export async function updateActionChip(userId: string, chip: ActionChipData, type: string = 'dashboard'): Promise<void> {
    const activeCollection = {
        dashboard: ACTION_CHIPS_COLLECTION,
        accounting: ACCOUNTING_QUICK_NAV_ITEMS_COLLECTION,
        hr: HR_QUICK_NAV_ITEMS_COLLECTION,
    }[type] || ACTION_CHIPS_COLLECTION;

    const availableCollection = {
        dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
        accounting: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
        hr: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
    }[type] || AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION;

    let [activeChips, availableChips] = await Promise.all([
        getChipsFromCollection(userId, activeCollection),
        getChipsFromCollection(userId, availableCollection)
    ]);

    if (activeChips.length === 0 && availableChips.length === 0) {
        activeChips = await getActionChips(userId, type);
        availableChips = await getAvailableActionChips(userId, type);
    }

    const activeIndex = activeChips.findIndex(c => c.id === chip.id);
    if (activeIndex !== -1) {
        activeChips[activeIndex] = chip;
        await updateChipsInCollection(userId, activeCollection, activeChips);
        return;
    }

    const availableIndex = availableChips.findIndex(c => c.id === chip.id);
    if (availableIndex !== -1) {
        availableChips[availableIndex] = chip;
        await updateChipsInCollection(userId, availableCollection, availableChips);
        return;
    }
}

export async function deleteRitualTasks(userId: string, ritualType: 'daily' | 'weekly'): Promise<void> {
    const db = getDb();
    const orgId = await getCurrentOrgId();
    const q = query(
        collection(db, TASKS_COLLECTION),
        where("orgId", "==", orgId),
        where("ritualType", "==", ritualType)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}
