
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { getUserProfile, updateUserProfile, UserProfile } from '@/services/user-profile-service';
import type { SidebarViewType } from '@/context/sidebar-view-context';

const defaultPreferences: UserProfile['preferences'] = {
    showDictationButton: true,
    showDashboardFrame: true,
    showMenuViewInstructions: true,
    showActionManagerAboutPanel: true, // Added new default
};

export function useUserPreferences() {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<UserProfile['preferences']>(defaultPreferences);
    const [isLoading, setIsLoading] = useState(true);

    const loadPreferences = useCallback(async () => {
        if (user) {
            setIsLoading(true);
            try {
                const profile = await getUserProfile(user.uid);
                // Merge fetched preferences with defaults to ensure all keys are present
                setPreferences({ ...defaultPreferences, ...(profile?.preferences || {}) });
            } catch (error) {
                console.error("Failed to load user preferences:", error);
                // Set default preferences on error
                setPreferences(defaultPreferences);
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    const updatePreferences = async (newPrefs: Partial<UserProfile['preferences']>) => {
        if (user) {
            const updatedPrefs = { ...preferences, ...newPrefs };
            setPreferences(updatedPrefs); // Optimistic update
            try {
                await updateUserProfile(user.uid, user.email || '', { preferences: updatedPrefs });
            } catch (error) {
                console.error("Failed to update user preferences:", error);
                // Revert on failure
                loadPreferences(); 
            }
        }
    };

    return { preferences, updatePreferences, isLoading, loadPreferences };
}

    