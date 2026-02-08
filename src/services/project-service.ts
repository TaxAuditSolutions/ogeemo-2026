'use client';

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { type Project, type Event as TaskEvent, type ProjectTemplate, type TaskStatus, type ProjectStep, type ProjectFolder, type ActionChipData, TimeSession, type ProjectUrgency, type ProjectImportance } from '@/types/calendar-types';
import { Mail, Briefcase, ListTodo, Calendar, Clock, Contact, Beaker, Calculator, Folder, Wand2, MessageSquare, HardHat, Contact2, Share2, Users2, PackageSearch, Megaphone, Landmark, DatabaseBackup, BarChart3, HeartPulse, Bell, Bug, Database, FilePlus2, LogOut, Settings, Lightbulb, Info, BrainCircuit, GitMerge, Pencil, ListChecks, FilePenLine, Route, Link as LinkIcon, FileOutput, FileDigit, TrendingUp, TrendingDown, BookText, ShieldCheck, WalletCards, UserPlus, Banknote, Percent, FileSignature, FileInput, Activity, Wrench, Users, ListPlus, ArrowDownAZ, ArrowUpZA } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { addMinutes } from 'date-fns';
import { allMenuItems } from '@/lib/menu-items';
import { accountingMenuItems } from '@/data/accounting-menu-items';
import hrMenuItems from '@/data/hr-menu-items';

export type { Project };

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
  { label: 'Time & Event Scheduler', icon: BrainCircuit, href: '/master-mind'},
];

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

const docToProject = (doc: any): Project => {
  const data = doc.data();
  if (!data) throw new Error("Document data is missing.");
  return {
    id: doc.id,
    name: data.name,
    description: data.description || '',
    clientId: data.clientId || null,
    contactId: data.contactId || null,
    userId: data.userId,
    createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
    steps: (data.steps || []).map((step: any) => ({
        ...step,
        startTime: (step.startTime as Timestamp)?.toDate ? (step.startTime as Timestamp).toDate() : null,
    })),
    status: data.status || 'planning',
    urgency: data.urgency || 'important',
    importance: data.importance || 'B',
    projectManagerId: data.projectManagerId || null,
    startDate: (data.startDate as Timestamp)?.toDate ? (data.startDate as Timestamp).toDate() : null,
    endDate: (data.endDate as Timestamp)?.toDate ? (data.endDate as Timestamp).toDate() : null,
    projectValue: data.projectValue || null,
  };
};

const docToTask = (doc: any): TaskEvent => {
  const data = doc.data();
  if (!data) throw new Error("Document data is missing.");
  return {
    id: doc.id,
    title: data.title,
    description: data.description || '',
    start: (data.start as Timestamp)?.toDate(),
    end: (data.end as Timestamp)?.toDate(),
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
        startTime: (session.startTime as Timestamp)?.toDate() || new Date(),
        endTime: (session.endTime as Timestamp)?.toDate() || new Date(),
    })),
    urgency: data.urgency,
    importance: data.importance,
    ritualType: data.ritualType,
  };
};

const docToTemplate = (doc: any): ProjectTemplate => ({ id: doc.id, ...doc.data() } as ProjectTemplate);
const docToFolder = (doc: any): ProjectFolder => ({ id: doc.id, ...doc.data() } as ProjectFolder);
const iconMap: { [key: string]: LucideIcon } = {
  Mail, Briefcase, ListTodo, Calendar, Clock, Contact, Beaker, Calculator, Folder, Wand2, MessageSquare, HardHat, Contact2, Share2, Users2, PackageSearch, Megaphone, Landmark, DatabaseBackup, BarChart3, HeartPulse, Bell, Bug, Database, FilePlus2, LogOut, Settings, Lightbulb, Info, BrainCircuit, GitMerge, Pencil, ListChecks, FilePenLine, Route, LinkIcon,
  FileDigit, FileOutput, ListPlus, TrendingUp, TrendingDown, BookText, ShieldCheck, WalletCards, UserPlus, Banknote, Percent, FileSignature, FileInput, Activity, Wrench, Users, ArrowDownAZ, ArrowUpZA
};

const docToActionChip = (chipData: any): ActionChipData => {
    const iconName = chipData.iconName as keyof typeof iconMap;
    return {
        ...chipData,
        icon: iconMap[iconName] || Wand2,
    } as ActionChipData;
};

export async function getProjects(userId: string): Promise<Project[]> {
  const db = getDb();
  const q = query(collection(db, PROJECTS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToProject).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    if (!projectId || projectId === 'inbox') return null;
    const db = getDb();
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
        return docToProject(projectSnap);
    }
    return null;
}

export async function addProject(projectData: Omit<Project, 'id'>): Promise<Project> {
    const db = getDb();
    const dataToSave = {
        ...projectData,
        createdAt: projectData.createdAt || new Date(),
        startDate: projectData.startDate || null,
        endDate: projectData.endDate || null,
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
    return { id: docRef.id, ...dataToSave };
}

export async function updateProject(projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectRef, projectData);
}

export async function deleteProject(projectId: string, taskIds: string[]): Promise<void> {
    const db = getDb();
    const batch = writeBatch(db);
    taskIds.forEach(taskId => {
        const taskRef = doc(db, TASKS_COLLECTION, taskId);
        batch.delete(taskRef);
    });
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    batch.delete(projectRef);
    await batch.commit();
}

export async function deleteProjects(projectIds: string[]): Promise<void> {
    const db = getDb();
    const batch = writeBatch(db);
    for (const projectId of projectIds) {
        const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
        batch.delete(projectRef);
        const tasksQuery = query(collection(db, TASKS_COLLECTION), where("projectId", "==", projectId));
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.forEach(taskDoc => {
            batch.delete(taskDoc.ref);
        });
    }
    await batch.commit();
}

export async function getTasksForProject(userId: string, projectId: string): Promise<TaskEvent[]> {
  const db = getDb();
  let q;
  if (projectId === 'inbox' || !projectId) {
      q = query(
        collection(db, TASKS_COLLECTION), 
        where("userId", "==", userId),
        where("projectId", "==", null)
      );
  } else {
      q = query(
        collection(db, TASKS_COLLECTION), 
        where("userId", "==", userId),
        where("projectId", "==", projectId)
      );
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTask);
}

export async function getTaskById(taskId: string): Promise<TaskEvent | null> {
    const db = getDb();
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
        return docToTask(taskSnap);
    }
    return null;
}

export async function getTasksForUser(userId: string): Promise<TaskEvent[]> {
    const db = getDb();
    const q = query(collection(db, TASKS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToTask);
}

export async function addTask(taskData: Omit<TaskEvent, 'id'>): Promise<TaskEvent> {
    const db = getDb();
    const dataToSave = {
        ...taskData,
        start: taskData.start || null,
        end: taskData.end || null,
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
                return { ...dataToSave, id: newTaskId, stepId: stepId };
            }
        }
    }
    return { ...dataToSave, id: newTaskId };
}

export async function updateTask(taskId: string, taskData: Partial<Omit<TaskEvent, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const dataToUpdate = { ...taskData };
    if ('projectId' in dataToUpdate && dataToUpdate.projectId === undefined) {
        dataToUpdate.projectId = null;
    }
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
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
        const taskData = docToTask(taskSnap);
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
    const batch = writeBatch(db);
    todoIds.forEach(id => {
        const docRef = doc(db, TASKS_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
}

export async function getProjectTemplates(userId: string): Promise<ProjectTemplate[]> {
    const db = getDb();
    const q = query(collection(db, TEMPLATES_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToTemplate);
}

export async function addProjectTemplate(templateData: Omit<ProjectTemplate, 'id'>): Promise<ProjectTemplate> {
    const db = getDb();
    const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), templateData);
    return { id: docRef.id, ...templateData };
}

export async function updateProjectTemplate(templateId: string, templateData: Partial<Omit<ProjectTemplate, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const templateRef = doc(db, TEMPLATES_COLLECTION, templateId);
    await updateDoc(templateRef, templateData);
}

export async function deleteProjectTemplate(templateId: string): Promise<void> {
    const db = getDb();
    const templateRef = doc(db, TEMPLATES_COLLECTION, templateId);
    await deleteDoc(templateRef);
}

export async function getActionChips(userId: string, type: ChipMenuType = 'dashboard'): Promise<ActionChipData[]> {
    const collectionNameMap = {
        dashboard: ACTION_CHIPS_COLLECTION,
        accounting: ACCOUNTING_QUICK_NAV_ITEMS_COLLECTION,
        hr: HR_QUICK_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type];
    const db = getDb();
    const docRef = doc(db, collectionName, userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        const defaultSourceMap = {
            dashboard: defaultChips,
            accounting: accountingMenuItems.slice(0, 4),
            hr: hrMenuItems,
        };
        const defaultSource = defaultSourceMap[type];
        return defaultSource.map((c) => ({
            ...c, 
            id: `default-${typeof c.href === 'string' ? c.href : (c.href as any).pathname}`, 
            userId
        }));
    }
    return getChipsFromCollection(userId, collectionName);
}

export async function getAvailableActionChips(userId: string, type: ChipMenuType = 'dashboard'): Promise<ActionChipData[]> {
    const collectionNameMap = {
        dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
        accounting: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
        hr: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type];
    const userActionChips = await getActionChips(userId, type);
    const usedHrefs = new Set(userActionChips.map(c => typeof c.href === 'string' ? c.href : (c.href as any).pathname));
    const defaultSourceMap = {
        dashboard: allMenuItems,
        accounting: accountingMenuItems,
        hr: hrMenuItems,
    };
    const defaultSource = defaultSourceMap[type];
    const getDefaultsNotUsed = () => defaultSource
        .filter(item => !usedHrefs.has(item.href))
        .map(item => ({ ...item, id: `default-${item.href}`, userId }));
    const db = getDb();
    const docRef = doc(db, collectionName, userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
        return getDefaultsNotUsed();
    }
    const customAvailable = await getChipsFromCollection(userId, collectionName);
    const filteredCustomAvailable = customAvailable.filter(item => !usedHrefs.has(typeof item.href === 'string' ? item.href : (item.href as any).pathname));
    const combined = [...filteredCustomAvailable];
    const customHrefs = new Set(filteredCustomAvailable.map(c => typeof c.href === 'string' ? c.href : (c.href as any).pathname));
    getDefaultsNotUsed().forEach(item => {
        if (!customHrefs.has(item.href)) {
            combined.push(item);
        }
    });
    return combined.sort((a,b) => a.label.localeCompare(b.label));
}

export async function updateActionChips(userId: string, chips: ActionChipData[], type: ChipMenuType = 'dashboard'): Promise<void> {
    const collectionNameMap = {
        dashboard: ACTION_CHIPS_COLLECTION,
        accounting: ACCOUNTING_QUICK_NAV_ITEMS_COLLECTION,
        hr: HR_QUICK_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type];
    await updateChipsInCollection(userId, collectionName, chips);
}

export async function updateAvailableActionChips(userId: string, chips: ActionChipData[], type: ChipMenuType = 'dashboard'): Promise<void> {
    const collectionNameMap = {
        dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
        accounting: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
        hr: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type];
    await updateChipsInCollection(userId, collectionName, chips);
}

export async function getTrashedActionChips(userId: string): Promise<ActionChipData[]> {
    return getChipsFromCollection(userId, TRASHED_ACTION_CHIPS_COLLECTION);
}

export async function trashActionChips(userId: string, chipsToTrash: ActionChipData[], menuType: ChipMenuType = 'dashboard'): Promise<void> {
    const allUserChips = await getActionChips(userId, menuType);
    const allAvailableChips = await getAvailableActionChips(userId, menuType);
    const allTrashedChips = await getTrashedActionChips(userId);
    const chipIdsToTrash = new Set(chipsToTrash.map(c => c.id));
    const newUserChips = allUserChips.filter(c => !chipIdsToTrash.has(c.id));
    const newAvailableChips = allAvailableChips.filter(c => !chipIdsToTrash.has(c.id));
    const chipsActuallyBeingTrashed = [...allUserChips, ...allAvailableChips].filter(c => chipIdsToTrash.has(c.id));
    if (chipsActuallyBeingTrashed.length === 0) return;
    const newTrashedChips = [...allTrashedChips, ...chipsActuallyBeingTrashed];
    await Promise.all([
        updateActionChips(userId, newUserChips, menuType),
        updateAvailableActionChips(userId, newAvailableChips, menuType),
        updateChipsInCollection(userId, TRASHED_ACTION_CHIPS_COLLECTION, newTrashedChips)
    ]);
}

export async function restoreActionChips(userId: string, chipsToRestore: ActionChipData[]): Promise<void> {
    const availableChips = await getAvailableActionChips(userId, 'dashboard');
    const trashedChips = await getTrashedActionChips(userId);
    const chipIdsToRestore = new Set(chipsToRestore.map(c => c.id));
    const newAvailableChips = [...availableChips, ...chipsToRestore];
    const newTrashedChips = trashedChips.filter(c => !chipIdsToRestore.has(c.id));
    await Promise.all([
        updateAvailableActionChips(userId, newAvailableChips, 'dashboard'),
        updateChipsInCollection(userId, TRASHED_ACTION_CHIPS_COLLECTION, newTrashedChips)
    ]);
}

export async function deleteActionChips(userId: string, chipIdsToDelete: string[]): Promise<void> {
  const db = getDb();
  const docRef = doc(db, TRASHED_ACTION_CHIPS_COLLECTION, userId);
  await setDoc(docRef, { chips: [] }, { merge: true });
}

export async function addActionChip(chipData: Omit<ActionChipData, 'id'>, type: ChipMenuType = 'dashboard'): Promise<ActionChipData> {
  const collectionNameMap = {
    dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
    accounting: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
    hr: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
  };
  const collectionName = collectionNameMap[type];
  const db = getDb();
  const docRef = doc(db, collectionName, chipData.userId);
  const docSnap = await getDoc(docRef);
  const existingChips = docSnap.exists() ? (docSnap.data().chips || []).map(docToActionChip) : [];
  const iconName = Object.keys(iconMap).find(key => iconMap[key] === chipData.icon);
  const { icon, ...restOfChipData } = chipData;
  const newChipForDb = { ...restOfChipData, iconName: iconName || 'Wand2' };
  const newId = `chip_${Date.now()}`;
  const updatedChips = [...existingChips, {...newChipForDb, id: newId }];
  await updateChipsInCollection(chipData.userId, collectionName, updatedChips);
  return { ...chipData, id: newId };
}

export async function deleteRitualTasksByType(userId: string, ritualType: 'daily' | 'weekly'): Promise<void> {
    return deleteRitualTasks(userId, ritualType);
}