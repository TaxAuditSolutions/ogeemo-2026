import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

/**
 * Named, user-authored workflows: an ordered set of destinations (chips)
 * representing a way of working - e.g. "Bookkeeping", "Quotes".
 *
 * Beta feedback: default Workspace navigation should follow the user's
 * business workflow; rather than shipping speculative built-in presets, users
 * compose their own from existing destinations. One document per user.
 * Coordination: OG-035 (navigation/default Groups mechanism) - the sidebar
 * override resolves through src/lib/workspace-workflow.ts.
 */
export interface WorkflowItem {
    id: string;
    label: string;
    href: string;
}

export interface Workflow {
    id: string;
    name: string;
    items: WorkflowItem[];
    createdAt?: unknown;
    updatedAt?: unknown;
}

const WORKFLOW_SETS_COLLECTION = 'userWorkflowSets';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

/** Loads all workflows for a user (single per-user document). */
export async function getUserWorkflows(userId: string): Promise<Workflow[]> {
    if (!userId) return [];
    const snap = await getDoc(doc(getDb(), WORKFLOW_SETS_COLLECTION, userId));
    if (!snap.exists()) return [];
    const data = snap.data() as { workflows?: Workflow[] };
    return Array.isArray(data.workflows) ? data.workflows : [];
}

/** Replaces the user's workflow list (single document - workflows are small). */
export async function saveUserWorkflows(userId: string, workflows: Workflow[]): Promise<void> {
    if (!userId) throw new Error('User must be logged in.');
    await setDoc(
        doc(getDb(), WORKFLOW_SETS_COLLECTION, userId),
        { workflows, updatedAt: new Date() },
        { merge: true },
    );
}
