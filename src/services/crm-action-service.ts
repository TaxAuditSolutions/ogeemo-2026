
'use client';

import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';

export interface Action {
  id: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done';
  position: number;
  leadName: string;
  userId?: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CRM_ACTIONS_COLLECTION = 'crmActions';

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
  let tokenResult;
  try {
    tokenResult = await currentUser.getIdTokenResult();
  } catch (error) {
    console.warn('CRM action service: unable to read auth claims; falling back to user profile org lookup.', error);
  }
  const claimedOrgId = tokenResult?.claims?.orgId;

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

const docToAction = (doc: any): Action => ({
  id: doc.id,
  ...doc.data(),
} as Action);

export async function getAllCrmActions(_userId?: string): Promise<Action[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(
    collection(db, CRM_ACTIONS_COLLECTION),
    where('orgId', '==', orgId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToAction);
}


export async function getActionsForLead(_userId: string, leadName: string): Promise<Action[]> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const q = query(
    collection(db, CRM_ACTIONS_COLLECTION),
    where('orgId', '==', orgId),
    where('leadName', '==', leadName)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToAction).sort((a, b) => a.position - b.position);
}

export async function addAction(data: Omit<Action, 'id'>): Promise<Action> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const now = new Date();
  const dataToSave = {
    ...data,
    orgId,
    createdBy: currentUser.uid,
    updatedBy: currentUser.uid,
    createdAt: now,
    updatedAt: now,
  };
  const collectionRef = collection(db, CRM_ACTIONS_COLLECTION);
  const docRef = await addDoc(collectionRef, dataToSave);
  return { id: docRef.id, ...dataToSave };
}

export async function updateAction(id: string, data: Partial<Omit<Action, 'id' | 'userId'>>): Promise<void> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, CRM_ACTIONS_COLLECTION, id);
  const currentSnap = await getDoc(docRef);

  if (!currentSnap.exists() || currentSnap.data()?.orgId !== orgId) {
    throw new Error('Action not found in your organization.');
  }

  await updateDoc(docRef, {
    ...data,
    updatedBy: currentUser.uid,
    updatedAt: new Date(),
  });
}

export async function deleteAction(id: string): Promise<void> {
  const db = getDb();
  const orgId = await getCurrentOrgId();
  const docRef = doc(db, CRM_ACTIONS_COLLECTION, id);
  const currentSnap = await getDoc(docRef);

  if (!currentSnap.exists() || currentSnap.data()?.orgId !== orgId) {
    throw new Error('Action not found in your organization.');
  }

  await deleteDoc(docRef);
}

export async function updateActionPositions(updates: { id: string; position: number; status: string }[]): Promise<void> {
  const db = getDb();
  const currentUser = getCurrentAuthContext();
  const orgId = await getCurrentOrgId();
  const batch = writeBatch(db);

  for (const update of updates) {
    const docRef = doc(db, CRM_ACTIONS_COLLECTION, update.id);
    const currentSnap = await getDoc(docRef);

    if (!currentSnap.exists() || currentSnap.data()?.orgId !== orgId) {
      continue;
    }

    batch.update(docRef, {
      position: update.position,
      status: update.status,
      updatedBy: currentUser.uid,
      updatedAt: new Date(),
    });
  }

  await batch.commit();
}
