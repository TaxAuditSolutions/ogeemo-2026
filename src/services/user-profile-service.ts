
'use client';

import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/lib/firebase';
import type { SidebarViewType } from '@/context/sidebar-view-context';

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
    createdAt?: any;
    updatedAt?: any;
    preferences?: {
        showDictationButton?: boolean;
        showDashboardFrame?: boolean;
        showMenuViewInstructions?: boolean;
        showActionManagerAboutPanel?: boolean; // Added this line
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

const PROFILES_COLLECTION = 'userProfiles';

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

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = await getDb();
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // Merge fetched preferences with defaults to ensure all keys are present
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
        // Return a default profile for a new user
        return {
            id: userId,
            email: '', // This should be populated on creation
            preferences: defaultPreferences,
        };
    }
}

export async function updateUserProfile(
    userId: string, 
    email: string,
    data: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const db = await getDb();
    const docRef = doc(db, PROFILES_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    const dataWithTimestamp: { [key: string]: any } = {
        ...data,
        updatedAt: serverTimestamp(),
    };

    if (docSnap.exists()) {
        const existingData = docSnap.data();
        
        // Correctly merge nested preference objects
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

        // Correctly merge nested businessAddress object
        if (data.businessAddress) {
            const existingAddress = existingData.businessAddress || {};
            dataWithTimestamp.businessAddress = {
                ...existingAddress,
                ...data.businessAddress,
            };
        }
        
        // Correctly merge nested homeAddress object
        if (data.homeAddress) {
            const existingAddress = existingData.homeAddress || {};
            dataWithTimestamp.homeAddress = {
                ...existingAddress,
                ...data.homeAddress,
            };
        }

        await updateDoc(docRef, dataWithTimestamp);
    } else {
        dataWithTimestamp.email = email;
        dataWithTimestamp.createdAt = serverTimestamp();
        // Ensure preferences field is created for new users, merging with any provided data
        dataWithTimestamp.preferences = { ...defaultPreferences, ...(data.preferences || {}) };
        await setDoc(docRef, dataWithTimestamp);
    }
}
