
'use client';

import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, collection, getDocs, query, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from '@/firebase';
import type { SidebarViewType } from '@/context/sidebar-view-context';


// --- Firebase Initialization (Self-contained) ---
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
    time: string; // e.g., "17:00"
    duration: number; // in minutes
    day?: DayOfWeek; // Only for weekly
    repeatEnabled?: boolean; // For daily repeats
    repeatCount?: number; // For daily repeats
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserProfile {
    id: string; // This will be the user's UID
    email: string;
    displayName?: string;
    employeeNumber?: string;
    companyName?: string;
    website?: string;
    businessPhone?: string;
    cellPhone?: string;
    bestPhone?: 'business' | 'cell';
    role?: UserRole;
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
        }
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
    }
};

const docToUserProfile = (doc: any): UserProfile => {
    const data = doc.data();
    return { id: doc.id, ...data } as UserProfile;
};

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

export async function updateUserProfile(
    userId: string, 
    email: string,
    data: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const db = getDb();
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    
    try {
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

            await updateDoc(docRef, dataWithTimestamp);
        } else {
            dataWithTimestamp.email = email;
            dataWithTimestamp.createdAt = serverTimestamp();
            dataWithTimestamp.role = data.role || 'viewer'; // Default role for new users
            dataWithTimestamp.preferences = { ...defaultPreferences, ...(data.preferences || {}) };
            
            await setDoc(docRef, dataWithTimestamp);
        }
    } catch (error: any) {
        console.error(`Error updating user profile (${docRef.path}):`, {
            operation: 'update/set',
            path: docRef.path,
            requestData: data,
            error,
        });
        throw error;
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
    try {
        await deleteDoc(docRef);
    } catch (error: any) {
        console.error(`Error deleting user profile (${docRef.path}):`, error);
        throw error;
    }
}
