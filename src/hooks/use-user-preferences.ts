
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { getUserProfile, updateUserProfile, UserProfile } from '@/core/user-profile-service';

/**
 * @fileOverview A global state singleton for user preferences.
 * This ensures that updates made in one component (e.g., Settings)
 * are reflected instantly in others (e.g., Sidebar or ThemeOrchestrator)
 * without requiring a page refresh.
 */

const defaultPreferences: UserProfile['preferences'] = {
    showDictationButton: true,
    showDashboardFrame: true,
    showMenuViewInstructions: true,
    showActionManagerAboutPanel: true,
    defaultSidebarView: 'fullMenu',
    themeColors: {
        primary: '#1E8E86',
        background: '#ffffff',
        sidebar: '#1e293b',
        header: '#3DD5C0',
        border: '#e2e8f0',
    },
    planningRituals: {
        daily: { time: '17:00', duration: 25, repeatEnabled: false, repeatCount: 5 },
        weekly: { day: 'Friday', time: '15:00', duration: 90 },
    }
};

// Internal module-level state to share across hook instances
let globalPrefs: UserProfile['preferences'] = defaultPreferences;
let globalLoading = true;
let currentUserId: string | null = null;
const listeners = new Set<(prefs: UserProfile['preferences'], loading: boolean) => void>();

export function useUserPreferences() {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<UserProfile['preferences']>(globalPrefs);
    const [isLoading, setIsLoading] = useState<boolean>(globalLoading);

    const notify = useCallback(() => {
        listeners.forEach(l => l(globalPrefs, globalLoading));
    }, []);

    const fetchPreferences = useCallback(async (userId: string) => {
        globalLoading = true;
        notify();
        try {
            const profile = await getUserProfile(userId);
            if (profile?.preferences) {
                // Merge loaded preferences with defaults
                globalPrefs = {
                    ...defaultPreferences,
                    ...profile.preferences,
                    themeColors: { ...defaultPreferences?.themeColors, ...(profile.preferences.themeColors || {}) },
                    planningRituals: {
                        ...defaultPreferences?.planningRituals,
                        ...(profile.preferences.planningRituals || {}),
                        daily: { ...defaultPreferences?.planningRituals?.daily, ...(profile.preferences.planningRituals?.daily || {}) },
                        weekly: { ...defaultPreferences?.planningRituals?.weekly, ...(profile.preferences.planningRituals?.weekly || {}) },
                    }
                };
            }
        } catch (error) {
            console.error("useUserPreferences: Load failed", error);
        } finally {
            globalLoading = false;
            notify();
        }
    }, [notify]);

    useEffect(() => {
        const listener = (p: UserProfile['preferences'], l: boolean) => {
            setPreferences(p);
            setIsLoading(l);
        };
        listeners.add(listener);

        // Load data if user changes
        if (user && user.uid !== currentUserId) {
            currentUserId = user.uid;
            fetchPreferences(user.uid);
        } else if (!user) {
            currentUserId = null;
            globalPrefs = defaultPreferences;
            globalLoading = false;
            notify();
        }

        return () => {
            listeners.delete(listener);
        };
    }, [user, fetchPreferences, notify]);

    const updatePreferences = async (newPrefs: Partial<UserProfile['preferences']>) => {
        if (!user) return;

        // 1. Optimistic Global Update
        globalPrefs = { ...globalPrefs, ...newPrefs };
        notify();

        // 2. Persist to Firestore
        try {
            await updateUserProfile(user.uid, user.email || '', { preferences: globalPrefs });
        } catch (error) {
            console.error("useUserPreferences: Persistence failed", error);
            // In a professional environment we might revert here, but for this
            // prototype we prioritize immediate UI feedback.
        }
    };

    return { 
        preferences, 
        updatePreferences, 
        isLoading, 
        loadPreferences: () => user && fetchPreferences(user.uid) 
    };
}
