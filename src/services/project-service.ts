
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
import { initializeFirebase } from '@/firebase';
import { type Project, type Event as TaskEvent, type ProjectTemplate, type TaskStatus, type ProjectStep, type ProjectFolder, type ActionChipData, TimeSession, type ProjectUrgency, type ProjectImportance } from '@/types/calendar-types';
import { Mail, Briefcase, ListTodo, Calendar, Clock, Contact, Beaker, Calculator, Folder, Wand2, MessageSquare, HardHat, Contact2, Share2, Users2, PackageSearch, Megaphone, Landmark, DatabaseBackup, BarChart3, HeartPulse, Bell, Bug, Database, FilePlus2, LogOut, Settings, Lightbulb, Info, BrainCircuit, GitMerge, Pencil, ListChecks, FilePenLine, Route, Link as LinkIcon, FileOutput, FileDigit, TrendingUp, TrendingDown, BookText, ShieldCheck, WalletCards, UserPlus, Banknote, Percent, FileSignature, ListPlus, FileInput, Activity, Wrench, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { addMinutes } from 'date-fns';
import { allMenuItems } from '@/lib/menu-items';
import { accountingMenuItems } from '@/data/accounting-menu-items';
import hrMenuItems from '@/data/hr-menu-items';

// Re-export the Project type to make it available for other modules.
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


async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

// --- Type Converters ---
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
    startDate: (data.startDate as Timestamp)?.toDate() || null,
    endDate: (data.endDate as Timestamp)?.toDate() || null,
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
    workerId: data.workerId || null, // Added for payroll tracking
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
  // Add accounting icons here
  FileDigit, FileOutput, ListPlus, TrendingUp, TrendingDown, BookText, ShieldCheck, WalletCards, UserPlus, Banknote, Percent, FileSignature, FileInput, Activity, Wrench, Users,
};
const docToActionChip = (chipData: any): ActionChipData => {
    const iconName = chipData.iconName as keyof typeof iconMap;
    return {
        ...chipData,
        icon: iconMap[iconName] || Wand2, // Fallback icon
    } as ActionChipData;
};


// --- Folder Functions ---
export async function getProjectFolders(userId: string): Promise<ProjectFolder[]> {
  const db = await getDb();
  const q = query(collection(db, FOLDERS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToFolder);
}

export async function addProjectFolder(folderData: Omit<ProjectFolder, 'id'>): Promise<ProjectFolder> {
  const db = await getDb();
  const dataToSave = {
    ...folderData,
    parentId: folderData.parentId || null,
  };
  const docRef = await addDoc(collection(db, FOLDERS_COLLECTION), dataToSave);
  return { id: docRef.id, ...dataToSave };
}


// --- Project Functions ---

export async function getProjects(userId: string): Promise<Project[]> {
  const db = await getDb();
  const q = query(collection(db, PROJECTS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToProject).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    const db = await getDb();
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
        return docToProject(projectSnap);
    }
    return null;
}

export async function addProject(projectData: Omit<Project, 'id'>): Promise<Project> {
    const db = await getDb();

    // Ensure optional fields that are undefined are converted to null for Firestore
    const dataToSave = {
        ...projectData,
        createdAt: projectData.createdAt || new Date(), // Ensure createdAt is set
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


export async function addProjectWithTasks(
  projectData: Omit<Project, 'id' | 'createdAt'>,
  tasksData: Omit<TaskEvent, 'id' | 'userId' | 'projectId'>[]
): Promise<Project> {
  const db = await getDb();
  const batch = writeBatch(db);

  const projectRef = doc(collection(db, PROJECTS_COLLECTION));
  const newProjectData = { ...projectData, steps: [], createdAt: new Date() };
  batch.set(projectRef, newProjectData);

  tasksData.forEach((task, index) => {
    const taskRef = doc(collection(db, TASKS_COLLECTION));
    batch.set(taskRef, {
      ...task,
      projectId: projectRef.id,
      userId: projectData.userId,
      position: index, // Set initial position
    });
  });

  await batch.commit();
  return { id: projectRef.id, ...newProjectData, createdAt: newProjectData.createdAt };
}

export async function updateProject(projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
    await updateDoc(projectRef, projectData);
}

export async function updateProjectWithTasks(userId: string, projectId: string, projectData: Partial<Omit<Project, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
    const batch = writeBatch(db);
    const projectRef = doc(db, PROJECTS_COLLECTION, projectId);

    const stepsToSave = (projectData.steps || []).map(step => {
        const finalId = (step.id && !step.id.startsWith('temp_')) ? step.id : doc(collection(db, 'projects')).id;
        return { ...step, id: finalId };
    });

    batch.update(projectRef, { ...projectData, steps: stepsToSave });

    const existingTasksQuery = query(collection(db, TASKS_COLLECTION), where("projectId", "==", projectId));
    const existingTasksSnapshot = await getDocs(existingTasksQuery);
    const existingTasks = existingTasksSnapshot.docs.map(docToTask);

    const tasksByStepId = new Map(existingTasks.filter(t => t.stepId).map(t => [t.stepId, t]));
    const stepsInPlan = new Set(stepsToSave.map(s => s.id));

    for (const step of stepsToSave) {
        if (!step.id) continue;
        const existingTask = tasksByStepId.get(step.id);

        if (step.connectToCalendar && step.startTime) {
            const taskData: Partial<Omit<TaskEvent, 'id' | 'userId'>> = {
                title: step.title,
                description: step.description,
                start: step.startTime,
                end: addMinutes(step.startTime, step.durationMinutes!),
                status: 'todo',
                position: 0,
                projectId,
                stepId: step.id,
                isScheduled: true,
            };

            if (existingTask) {
                const taskRef = doc(db, TASKS_COLLECTION, existingTask.id);
                batch.update(taskRef, taskData);
            } else {
                const taskRef = doc(collection(db, TASKS_COLLECTION));
                batch.set(taskRef, { ...taskData, userId });
            }
        } else if (!step.connectToCalendar && existingTask) {
            const taskRef = doc(db, TASKS_COLLECTION, existingTask.id);
            batch.delete(taskRef);
        }
    }

    for (const task of existingTasks) {
        if (task.stepId && !stepsInPlan.has(task.stepId)) {
            const taskRef = doc(db, TASKS_COLLECTION, task.id);
            batch.delete(taskRef);
        }
    }

    await batch.commit();
}


export async function deleteProject(projectId: string, taskIds: string[]): Promise<void> {
    const db = await getDb();
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
    const db = await getDb();
    const batch = writeBatch(db);

    for (const projectId of projectIds) {
        // Delete the project document
        const projectRef = doc(db, PROJECTS_COLLECTION, projectId);
        batch.delete(projectRef);

        // Find and delete all tasks associated with this project
        const tasksQuery = query(collection(db, TASKS_COLLECTION), where("projectId", "==", projectId));
        const tasksSnapshot = await getDocs(tasksQuery);
        tasksSnapshot.forEach(taskDoc => {
            batch.delete(taskDoc.ref);
        });
    }

    await batch.commit();
}

// --- Task/Event Functions ---
export async function getTasksForProject(projectId: string): Promise<TaskEvent[]> {
  const db = await getDb();
  const q = query(collection(db, TASKS_COLLECTION), where("projectId", "==", projectId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToTask);
}

export async function getTaskById(taskId: string): Promise<TaskEvent | null> {
    const db = await getDb();
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
        return docToTask(taskSnap);
    }
    return null;
}

export async function getTasksForUser(userId: string): Promise<TaskEvent[]> {
    const db = await getDb();
    const q = query(collection(db, TASKS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToTask);
}

export async function addTask(taskData: Omit<TaskEvent, 'id'>): Promise<TaskEvent> {
    const db = await getDb();
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
            
            // Check if a step for this task already exists to prevent duplication
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
                // Update the task with the newly created stepId
                await updateDoc(docRef, { stepId: stepId });
                return { ...dataToSave, id: newTaskId, stepId: stepId };
            }
        }
    }

    return { ...dataToSave, id: newTaskId };
}


export async function updateTask(taskId: string, taskData: Partial<Omit<TaskEvent, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    
    // Ensure that if projectId is explicitly passed as undefined, it gets set to null.
    // This happens when dragging an item from a project board to the unassigned "Action Items".
    const dataToUpdate = { ...taskData };
    if ('projectId' in dataToUpdate && dataToUpdate.projectId === undefined) {
        dataToUpdate.projectId = null;
    }

    await updateDoc(taskRef, dataToUpdate);
}

export async function updateTaskPositions(tasksToUpdate: { id: string; position: number; status: TaskStatus }[]): Promise<void> {
    const db = await getDb();
    const batch = writeBatch(db);
    tasksToUpdate.forEach(task => {
        const taskRef = doc(db, TASKS_COLLECTION, task.id);
        batch.update(taskRef, { position: task.position, status: task.status });
    });
    await batch.commit();
}


export async function deleteTask(taskId: string): Promise<void> {
    const db = await getDb();
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);

    if (taskSnap.exists()) {
        const taskData = docToTask(taskSnap);
        // If the task is linked to a project and has a step ID, remove the step
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

export async function deleteTasks(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;
    const db = await getDb();
    const batch = writeBatch(db);
    taskIds.forEach(id => {
        const taskRef = doc(db, TASKS_COLLECTION, id);
        batch.delete(taskRef);
    });
    await batch.commit();
}

export async function updateTodosStatus(todoIds: string[], completed: boolean): Promise<void> {
    const db = await getDb();
    if (todoIds.length === 0) return;
    const batch = writeBatch(db);
    const status = completed ? 'done' : 'todo';
    todoIds.forEach(id => {
        const docRef = doc(db, TASKS_COLLECTION, id);
        batch.update(docRef, { completed, status });
    });
    await batch.commit();
}


export async function deleteAllTasksForUser(userId: string): Promise<void> {
    const db = await getDb();
    const batch = writeBatch(db);
    const q = query(collection(db, TASKS_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return; // No tasks to delete
    }

    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}

export async function deleteRitualTasks(userId: string, ritualType: 'daily' | 'weekly'): Promise<void> {
    const db = await getDb();
    const batch = writeBatch(db);
    const q = query(
        collection(db, TASKS_COLLECTION), 
        where("userId", "==", userId),
        where("ritualType", "==", ritualType)
    );
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}


// --- Template Functions ---

export async function getProjectTemplates(userId: string): Promise<ProjectTemplate[]> {
    const db = await getDb();
    const q = query(collection(db, TEMPLATES_COLLECTION), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToTemplate);
}

export async function addProjectTemplate(templateData: Omit<ProjectTemplate, 'id'>): Promise<ProjectTemplate> {
    const db = await getDb();
    const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), templateData);
    return { id: docRef.id, ...templateData };
}

export async function updateProjectTemplate(templateId: string, templateData: Partial<Omit<ProjectTemplate, 'id' | 'userId'>>): Promise<void> {
    const db = await getDb();
    const templateRef = doc(db, TEMPLATES_COLLECTION, templateId);
    await updateDoc(templateRef, templateData);
}

export async function deleteProjectTemplate(templateId: string): Promise<void> {
    const db = await getDb();
    const templateRef = doc(db, TEMPLATES_COLLECTION, templateId);
    await deleteDoc(templateRef);
}


// --- Action Chip Functions ---

const defaultChips: Omit<ActionChipData, 'id' | 'userId'>[] = [
  { label: 'OgeeMail', icon: Mail, href: '/ogeemail' },
  { label: 'Contacts', icon: Contact, href: '/contacts' },
  { label: 'Projects', icon: Briefcase, href: '/projects' },
  { label: 'Task & Event Mngr', icon: BrainCircuit, href: '/master-mind'},
];

async function getChipsFromCollection(userId: string, collectionName: string): Promise<ActionChipData[]> {
    const db = await getDb();
    const docRef = doc(db, collectionName, userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        const chips = (data.chips || []).map(docToActionChip);
        // Ensure position exists if it doesn't, then sort
        return chips
            .map((chip: any, index: number) => ({ ...chip, position: chip.position ?? index }))
            .sort((a: any, b: any) => a.position - b.position);
    }
    return [];
}

async function updateChipsInCollection(userId: string, collectionName: string, chips: ActionChipData[]): Promise<void> {
    const db = await getDb();
    const docRef = doc(db, collectionName, userId);
    const chipsToSave = chips.map((chip, index) => {
        const iconName = Object.keys(iconMap).find(key => iconMap[key] === chip.icon);
        const { icon, ...rest } = chip;
        return { ...rest, position: index, iconName: iconName || 'Wand2' };
    });
    await setDoc(docRef, { chips: chipsToSave }, { merge: true });
}

export async function getActionChips(userId: string, type: 'dashboard' | 'accountingQuickNavItems' | 'hrQuickNavItems' = 'dashboard'): Promise<ActionChipData[]> {
    const collectionNameMap = {
        dashboard: ACTION_CHIPS_COLLECTION,
        accountingQuickNavItems: ACCOUNTING_QUICK_NAV_ITEMS_COLLECTION,
        hrQuickNavItems: HR_QUICK_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type];

    const defaultAccountingChips = accountingMenuItems.slice(0, 4);
    const defaultHrChips = hrMenuItems;

    const defaultSourceMap = {
        dashboard: defaultChips,
        accountingQuickNavItems: defaultAccountingChips,
        hrQuickNavItems: defaultHrChips,
    };
    const defaultSource = defaultSourceMap[type];
    
    const chips = await getChipsFromCollection(userId, collectionName);
    if (chips.length === 0) {
        const docRef = doc(await getDb(), collectionName, userId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            const chipsToSave = defaultSource.map(c => ({...c, id: `default-${c.label}`, userId}));
            await updateChipsInCollection(userId, collectionName, chipsToSave);
            return chipsToSave;
        }
    }
    return chips;
}

export async function getAvailableActionChips(userId: string, type: 'dashboard' | 'availableAccountingNavItems' | 'availableHrNavItems' = 'dashboard'): Promise<ActionChipData[]> {
    const collectionNameMap = {
        dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
        availableAccountingNavItems: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
        availableHrNavItems: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type];
    
    const defaultSourceMap = {
        dashboard: allMenuItems,
        availableAccountingNavItems: accountingMenuItems,
        availableHrNavItems: hrMenuItems,
    };
    const userChipsTypeMap = {
        dashboard: 'dashboard',
        availableAccountingNavItems: 'accountingQuickNavItems',
        availableHrNavItems: 'hrQuickNavItems',
    };

    const defaultSource = defaultSourceMap[type];
    const userChipsType = userChipsTypeMap[type] as 'dashboard' | 'accountingQuickNavItems' | 'hrQuickNavItems';

    const chips = await getChipsFromCollection(userId, collectionName);
    const userActionChips = await getActionChips(userId, userChipsType);
    const usedHrefs = new Set(userActionChips.map(c => typeof c.href === 'string' ? c.href : c.href.pathname));
    
    const defaultAvailable = defaultSource
        .filter(item => !usedHrefs.has(item.href))
        .map(item => ({ ...item, id: `default-${item.href}`, userId }));
        
    const customAvailable = chips.filter(c => !usedHrefs.has(typeof c.href === 'string' ? c.href : c.href.pathname));
    
    const combined = [...customAvailable];
    const customHrefs = new Set(customAvailable.map(c => typeof c.href === 'string' ? c.href : c.href.pathname));
    defaultAvailable.forEach(item => {
        if (!customHrefs.has(item.href)) {
            combined.push(item);
        }
    });

    return combined;
}

export async function updateActionChips(userId: string, chips: ActionChipData[], type: 'dashboard' | 'accounting' | 'hr' = 'dashboard'): Promise<void> {
    const collectionNameMap = {
        dashboard: ACTION_CHIPS_COLLECTION,
        accounting: ACCOUNTING_QUICK_NAV_ITEMS_COLLECTION,
        hr: HR_QUICK_NAV_ITEMS_COLLECTION,
    };
    const collectionName = collectionNameMap[type];
    await updateChipsInCollection(userId, collectionName, chips);
}

export async function updateAvailableActionChips(userId: string, chips: ActionChipData[], type: 'dashboard' | 'accounting' | 'hr' = 'dashboard'): Promise<void> {
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

export async function trashActionChips(userId: string, chipsToTrash: ActionChipData[]): Promise<void> {
    const allUserChips = await getActionChips(userId);
    const allAvailableChips = await getAvailableActionChips(userId);
    const allTrashedChips = await getTrashedActionChips(userId);

    const chipIdsToTrash = new Set(chipsToTrash.map(c => c.id));
    
    const newUserChips = allUserChips.filter(c => !chipIdsToTrash.has(c.id));
    const newAvailableChips = allAvailableChips.filter(c => !chipIdsToTrash.has(c.id));
    const newTrashedChips = [...allTrashedChips, ...chipsToTrash];

    await Promise.all([
        updateActionChips(userId, newUserChips),
        updateAvailableActionChips(userId, newAvailableChips),
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
  const db = await getDb();
  const docRef = doc(db, TRASHED_ACTION_CHIPS_COLLECTION, userId);
  // Setting an empty array to the 'chips' field effectively deletes all items.
  await setDoc(docRef, { chips: [] }, { merge: true });
}


export async function addActionChip(chipData: Omit<ActionChipData, 'id'>, type: 'dashboard' | 'accounting' | 'hr' = 'dashboard'): Promise<ActionChipData> {
  const collectionNameMap = {
    dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
    accounting: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
    hr: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
  };
  const collectionName = collectionNameMap[type];
  const db = await getDb();
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


export async function updateActionChip(userId: string, updatedChip: ActionChipData, type: 'dashboard' | 'accounting' | 'hr' = 'dashboard'): Promise<void> {
    const userChipsCollectionMap = {
        dashboard: ACTION_CHIPS_COLLECTION,
        accounting: ACCOUNTING_QUICK_NAV_ITEMS_COLLECTION,
        hr: HR_QUICK_NAV_ITEMS_COLLECTION,
    };
    const availableChipsCollectionMap = {
        dashboard: AVAILABLE_ACTION_CHIPS_COLLECTION,
        accounting: AVAILABLE_ACCOUNTING_NAV_ITEMS_COLLECTION,
        hr: AVAILABLE_HR_NAV_ITEMS_COLLECTION,
    };
    const userChipsCollection = userChipsCollectionMap[type];
    const availableChipsCollection = availableChipsCollectionMap[type];

    const userChips = await getChipsFromCollection(userId, userChipsCollection);
    const availableChips = await getChipsFromCollection(userId, availableChipsCollection);

    const isUserChip = userChips.some(c => c.id === updatedChip.id);

    // Find the icon name (string) from the icon component (function) before saving
    const iconName = Object.keys(iconMap).find(key => iconMap[key] === updatedChip.icon);
    const { icon, ...chipToSave } = updatedChip;
    const finalChipData = { ...chipToSave, iconName: iconName || 'Wand2' };

    if (isUserChip) {
        const newUserChips = userChips.map(c => c.id === updatedChip.id ? updatedChip : c);
        await updateActionChips(userId, newUserChips, type);
    } else {
        const newAvailableChips = availableChips.map(c => c.id === updatedChip.id ? updatedChip : c);
        await updateAvailableActionChips(userId, newAvailableChips, type);
    }
}
    

    
