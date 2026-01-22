
'use client';

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type LeadStatus = 'Unscheduled Leads' | 'Scheduled Leads' | 'Completed Leads';

export interface Lead {
  id: string;
  contactName: string;
  companyName: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  notes: string;
  userId: string;
}

const LEADS_COLLECTION = 'leads';

function getDb() {
  const { db } = getFirebaseServices();
  return db;
}

const docToLead = (doc: any): Lead => ({ id: doc.id, ...doc.data() } as Lead);

export async function getLeads(userId: string): Promise<Lead[]> {
  const db = getDb();
  const q = query(collection(db, LEADS_COLLECTION), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToLead);
}

export async function getLeadById(leadId: string): Promise<Lead | null> {
    const db = getDb();
    const docRef = doc(db, LEADS_COLLECTION, leadId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docToLead(docSnap) : null;
}

export function addLead(data: Omit<Lead, 'id'>): Promise<Lead> {
  return new Promise(async (resolve, reject) => {
    const db = getDb();
    const collectionRef = collection(db, LEADS_COLLECTION);
    addDoc(collectionRef, data)
        .then(docRef => resolve({ id: docRef.id, ...data }))
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: collectionRef.path,
                operation: 'create',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
            reject(serverError);
        });
  });
}

export function updateLead(id: string, data: Partial<Omit<Lead, 'id' | 'userId'>>): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const db = getDb();
    const docRef = doc(db, LEADS_COLLECTION, id);
    updateDoc(docRef, data)
        .then(resolve)
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
            reject(serverError);
        });
  });
}

export function deleteLead(id: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const db = getDb();
    const docRef = doc(db, LEADS_COLLECTION, id);
    deleteDoc(docRef)
        .then(resolve)
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            reject(serverError);
        });
  });
}
