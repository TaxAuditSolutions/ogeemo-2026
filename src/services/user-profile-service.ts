'use client';

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import type { SidebarViewType } from '@/context/sidebar-view-context';

function getDb() {
    const { db } = getFirebaseServices();
    return db;
}

function getFunctionsService() {
    const { functions } = getFirebaseServices();
    return functions;
}

type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface PlanningRitual {
    time: string;
    duration: number;
    day?: DayOfWeek;
    repeatEnabled?: boolean;
    repeatCount?: number;
}

export interface ThemeColors {
    primary?: string;
    background?: string;
    sidebar?: string;
    header?: string;
    border?: string;
}

export interface ThemePreset {
    name: string;
    colors: ThemeColors;
}

export interface UserProfile {
    id: string;
    email: string;
    displayName?: string;
    employeeNumber?: string;
    companyName?: string;
    website?: string;
    businessPhone?: string;
    cellPhone?: string;
    bestPhone?: 'business' | 'cell';
    role?: 'admin' | 'editor' | 'viewer' | 'none';
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
        defaultTaxRate?: number;
        planningRituals?: {
            daily: Omit<PlanningRitual, 'day'>;
            weekly: Omit<PlanningRitual, 'repeatEnabled' | 'repeatCount'>;
        };
        themeColors?: ThemeColors;
        customPresets?: ThemePreset[];
    };
}

const PROFILES_COLLECTION = 'users';

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
    defaultTaxRate: 15,
    planningRituals: {
        daily: { time: '17:00', duration: 25, repeatEnabled: false, repeatCount: 5 },
        weekly: { day: 'Friday', time: '15:00', duration: 90 },
    },
    themeColors: {
        primary: '#1E8E86',
        background: '#ffffff',
        sidebar: '#1e293b',
        header: '#3DD5C0',
        border: '#e2e8f0',
    },
    customPresets: [],
};

const docToUserProfile = (doc: any): UserProfile => {
    const data = doc.data();
    if (!data) return { id: doc.id, email: '', role: 'viewer' } as UserProfile;

    return { 
        id: doc.id, 
        ...data, 
        role: data.role || 'viewer',
        preferences: { ...defaultPreferences, ...(data.preferences || {}) }
    } as UserProfile;
};

export async function getUsers(): Promise<UserProfile[]> {
  const db = getDb();
  const q = query(collection(db, PROFILES_COLLECTION));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToUserProfile);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: PROFILES_COLLECTION,
            operation: 'list',
        } satisfies SecurityRuleContext));
    }
    throw error;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = getDb();
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docToUserProfile(docSnap);
        } else {
            return null;
        }
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'get',
            } satisfies SecurityRuleContext));
        }
        throw error;
    }
}

export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    const db = getDb();
    const q = query(collection(db, PROFILES_COLLECTION), where("email", "==", email.toLowerCase()));
    try {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return docToUserProfile(snapshot.docs[0]);
        }
        return null;
    } catch (error: any) {
        console.warn("Failed to find user by email:", error);
        return null;
    }
}

export async function updateUserProfile(
    userId: string, 
    email: string,
    data: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const db = getDb();
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

        await updateDoc(docRef, dataWithTimestamp).catch(async (error) => {
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: dataWithTimestamp,
                } satisfies SecurityRuleContext));
            }
        });
    } else {
        dataWithTimestamp.email = email.toLowerCase();
        dataWithTimestamp.createdAt = serverTimestamp();
        dataWithTimestamp.role = data.role || 'viewer';
        dataWithTimestamp.preferences = { ...defaultPreferences, ...(data.preferences || {}) };
        
        await setDoc(docRef, dataWithTimestamp).catch(async (error) => {
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'create',
                    requestResourceData: dataWithTimestamp,
                } satisfies SecurityRuleContext));
            }
        });
    }
}

export async function updateUserAuth(uid: string, data: { email?: string; password?: string }): Promise<any> {
    const functions = getFunctionsService();
    const updateUserAuthFn = httpsCallable(functions, 'updateUserAuth');
    try {
        const result = await updateUserAuthFn({ uid, ...data });
        return result.data;
    } catch (error: any) {
        console.error(`Error calling updateUserAuth function for UID ${uid}:`, error);
        throw error;
    }
}

export async function deleteUserProfile(userId: string): Promise<void> {
    const db = getDb();
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    await deleteDoc(docRef).catch(async (error) => {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete',
                requestResourceData: null,
            } satisfies SecurityRuleContext));
        }
    });
}