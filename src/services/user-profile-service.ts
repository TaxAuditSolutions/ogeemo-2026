
'use client';

import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, collection, getDocs, query, deleteDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { SidebarViewType } from '@/context/sidebar-view-context';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface PlanningRitual {
    time: string; // e.g., "17:00"
    duration: number; // in minutes
    day?: DayOfWeek; // Only for weekly
    repeatEnabled?: boolean; // For daily repeats
    repeatCount?: number; // For daily repeats
}

export interface UserProfile {
    id: string; // This will be the user's UID
    email: string;
    displayName?: string;
    companyName?: string;
    website?: string;
    businessPhone?: string;
    cellPhone?: string;
    bestPhone?: 'business' | 'cell';
    businessAddress?: {
        street?: string;
        city?: string;
        provinceState?: string;
        country?: string;
        postalCode?: string;
    };
    homeAddress?: {
        street?: string;
        city?: string;
        provinceState?: string;
        country?: string;
        postalCode?: string;
    };
    alternateContact?: string;
    alternateContactPhone?: string;
    businessNumber?: string;
    netEquity?: number;
    createdAt?: any;
    updatedAt?: any;
    notes?: string;
    preferences?: {
        showDictationButton?: boolean;
        showDashboardFrame?: boolean;
        showMenuViewInstructions?: boolean;
        showActionManagerAboutPanel?: boolean;
        defaultSidebarView?: SidebarViewType;
        menuOrder?: string[];
        accountingQuickNavOrder?: string[];
        googleAppsOrder?: string[];
        fileFolderOrder?: string[];
        planningRituals?: {
            daily: Omit<PlanningRitual, 'day'>;
            weekly: Omit<PlanningRitual, 'repeatEnabled' | 'repeatCount'>;
        }
    };
}

const PROFILES_COLLECTION = 'users';

async function getDb() {
    const { db } = await initializeFirebase();
    return db;
}

const defaultPreferences: UserProfile['preferences'] = {
    showDictationButton: true,
    showDashboardFrame: true,
    showMenuViewInstructions: true,
    showActionManagerAboutPanel: true,
    defaultSidebarView: 'grouped',
    menuOrder: [],
    accountingQuickNavOrder: [],
    googleAppsOrder: [],
    fileFolderOrder: [],
    planningRituals: {
        daily: { time: '17:00', duration: 25, repeatEnabled: false, repeatCount: 5 },
        weekly: { day: 'Friday', time: '15:00', duration: 90 },
    }
};

const docToUserProfile = (doc: any): UserProfile => {
    const data = doc.data();
    return { id: doc.id, ...data } as UserProfile;
};

export async function getUsers(): Promise<UserProfile[]> {
  const db = await getDb();
  const q = query(collection(db, PROFILES_COLLECTION));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docToUserProfile);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = await getDb();
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        const preferences = { 
            ...defaultPreferences, 
            ...(data.preferences || {}),
            planningRituals: {
                ...defaultPreferences.planningRituals,
                ...(data.preferences?.planningRituals || {}),
                daily: {
                    ...defaultPreferences.planningRituals?.daily,
                    ...(data.preferences?.planningRituals?.daily || {}),
                },
                weekly: {
                    ...defaultPreferences.planningRituals?.weekly,
                    ...(data.preferences?.planningRituals?.weekly || {}),
                }
            }
        };
        return { id: docSnap.id, ...data, preferences } as UserProfile;
    } else {
        return null;
    }
}

export function updateUserProfile(
    userId: string, 
    email: string,
    data: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const db = await getDb();
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    const dataWithTimestamp: { [key: string]: any } = {
        ...data,
        updatedAt: serverTimestamp(),
    };

    if (docSnap.exists()) {
        const existingData = docSnap.data();
        
        if (data.preferences) {
            const existingPrefs = existingData.preferences || {};
            dataWithTimestamp.preferences = {
                ...existingPrefs,
                ...data.preferences,
                planningRituals: {
                    ...existingPrefs.planningRituals,
                    ...(data.preferences.planningRituals || {}),
                },
            };
        }
        
        if (data.businessAddress) {
            const existingAddress = existingData.businessAddress || {};
            dataWithTimestamp.businessAddress = { ...existingAddress, ...data.businessAddress };
        }
        
        if (data.homeAddress) {
            const existingAddress = existingData.homeAddress || {};
            dataWithTimestamp.homeAddress = { ...existingAddress, ...data.homeAddress };
        }

        updateDoc(docRef, dataWithTimestamp)
            .then(resolve)
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: dataWithTimestamp,
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(serverError);
            });
    } else {
        dataWithTimestamp.email = email;
        dataWithTimestamp.createdAt = serverTimestamp();
        dataWithTimestamp.preferences = { ...defaultPreferences, ...(data.preferences || {}) };
        
        setDoc(docRef, dataWithTimestamp)
            .then(resolve)
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'create',
                    requestResourceData: dataWithTimestamp,
                });
                errorEmitter.emit('permission-error', permissionError);
                reject(serverError);
            });
    }
  });
}

export async function updateUserAuth(uid: string, data: { email?: string; password?: string }): Promise<any> {
    const { functions } = await initializeFirebase();
    const updateUserAuthFn = httpsCallable(functions, 'updateUserAuth');
    const result = await updateUserAuthFn({ uid, ...data });
    return result.data;
}


export function deleteUserProfile(userId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = await getDb();
        const docRef = doc(db, PROFILES_COLLECTION, userId);
        
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
