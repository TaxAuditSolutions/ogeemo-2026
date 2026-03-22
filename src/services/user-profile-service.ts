
'use client';

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { ensureSystemFolders } from './contact-folder-service';
import { addContact, updateContact, getContacts } from './contact-service';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

function getFunctionsService() {
    const { functions } = getFirebaseServices();
    return functions;
}

export type UserRole = 'Apprentice' | 'Mentor_Apprentice' | 'Certified_Mentor' | 'admin';

export interface UserProfile {
    id: string;
    email: string;
    displayName?: string;
    employeeNumber?: string;
    role?: UserRole;
    contactId?: string; // Linked ID in the Contact Hub
    preferences?: any;
    createdAt?: any;
    updatedAt?: any;
    notes?: string;
    is_mentor_certified?: boolean;
    mentor_shield_issued_date?: any;
    price_lock_status?: boolean;
}

const PROFILES_COLLECTION = 'users';
const CONTACTS_COLLECTION = 'contacts';

const docToUserProfile = (doc: any): UserProfile => ({ id: doc.id, ...doc.data() } as UserProfile);

export async function getUsers(): Promise<UserProfile[]> {
  const db = getDb();
  const q = query(collection(db, PROFILES_COLLECTION));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToUserProfile);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = getDb();
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docToUserProfile(docSnap) : null;
}

/**
 * Synchronizes a User Profile with a Contact Hub record.
 * Every user must have a searchable identity in the Contact Hub.
 */
export async function updateUserProfile(
    userId: string, 
    email: string,
    data: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const db = getDb();
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    
    const dataWithTimestamp: { [key: string]: any } = { ...data, updatedAt: serverTimestamp() };

    // 1. Ensure the user exists in the Contact Hub (SSoT)
    const allFolders = await ensureSystemFolders(userId);
    const adminFolder = allFolders.find(f => f.name === 'Admin' && f.isSystem);
    const contactId = docSnap.exists() ? docSnap.data().contactId : null;

    if (contactId) {
        await updateContact(contactId, {
            name: data.displayName,
            email: email,
            employeeNumber: data.employeeNumber,
        });
    } else {
        const newContact = await addContact({
            name: data.displayName || email,
            email: email,
            employeeNumber: data.employeeNumber,
            folderId: adminFolder?.id || 'all',
            userId: userId,
        } as any);
        dataWithTimestamp.contactId = newContact.id;
    }

    // 2. Update the Profile registry
    if (docSnap.exists()) {
        await updateDoc(docRef, dataWithTimestamp);
    } else {
        dataWithTimestamp.email = email.toLowerCase();
        dataWithTimestamp.createdAt = serverTimestamp();
        dataWithTimestamp.role = data.role || 'Apprentice'; // Default to Apprentice
        dataWithTimestamp.is_mentor_certified = data.is_mentor_certified ?? false;
        dataWithTimestamp.mentor_shield_issued_date = data.mentor_shield_issued_date ?? null;
        dataWithTimestamp.price_lock_status = data.price_lock_status ?? true;
        await setDoc(docRef, dataWithTimestamp);
    }
}

export async function deleteUserProfile(userId: string): Promise<void> {
    const db = getDb();
    const docSnap = await getDoc(doc(db, PROFILES_COLLECTION, userId));
    if (docSnap.exists()) {
        const contactId = docSnap.data().contactId;
        if (contactId) await deleteDoc(doc(db, CONTACTS_COLLECTION, contactId));
    }
    await deleteDoc(doc(db, PROFILES_COLLECTION, userId));
}

export async function updateUserAuth(uid: string, data: any): Promise<any> {
    const functions = getFunctionsService();
    const updateUserAuthFn = httpsCallable(functions, 'updateUserAuth');
    const result = await updateUserAuthFn({ uid, ...data });
    return result.data;
}
