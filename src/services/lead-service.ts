
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

export async function addLead(data: Omit<Lead, 'id'>): Promise<Lead> {
    const db = getDb();
    const docRef = await addDoc(collection(db, LEADS_COLLECTION), data);
    return { id: docRef.id, ...data };
}

export async function updateLead(id: string, data: Partial<Omit<Lead, 'id' | 'userId'>>): Promise<void> {
    const db = getDb();
    const docRef = doc(db, LEADS_COLLECTION, id);
    await updateDoc(docRef, data);
}

export async function deleteLead(id: string): Promise<void> {
    const db = getDb();
    const docRef = doc(db, LEADS_COLLECTION, id);
    await deleteDoc(docRef);
}
