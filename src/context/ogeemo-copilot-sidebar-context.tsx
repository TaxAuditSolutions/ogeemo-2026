'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    COPILOT_SIDEBAR_COLLAPSED_WIDTH,
    COPILOT_SIDEBAR_DEFAULT_WIDTH,
    clampCopilotSidebarWidth,
    getEffectiveCopilotSidebarWidth,
    parseStoredCopilotSidebarWidth,
} from '@/lib/copilot-sidebar-state';

const PINNED_STORAGE_KEY = 'ogeemo.copilot-sidebar.pinned';
const WIDTH_STORAGE_KEY = 'ogeemo.copilot-sidebar.width';

interface OgeemoCopilotSidebarContextValue {
    state: 'expanded' | 'collapsed';
    isPinned: boolean;
    isMobile: boolean;
    isMobileOpen: boolean;
    isResizing: boolean;
    preferredWidth: number;
    effectiveWidth: number;
    layoutWidth: number;
    setPinned: (pinned: boolean) => void;
    togglePinned: () => void;
    openAndPin: () => void;
    setMobileOpen: (open: boolean) => void;
    setPointerInside: (inside: boolean) => void;
    setFocusInside: (inside: boolean) => void;
    setPreferredWidth: (width: number) => void;
    setIsResizing: (resizing: boolean) => void;
}

const OgeemoCopilotSidebarContext = createContext<OgeemoCopilotSidebarContextValue | null>(null);

export function OgeemoCopilotSidebarProvider({ children }: { children: React.ReactNode }) {
    const { isPinned: isLeftSidebarPinned } = useSidebar();
    const isMobile = useIsMobile();
    const [isPinned, setPinnedState] = useState(true);
    const [isMobileOpen, setMobileOpen] = useState(false);
    const [pointerInside, setPointerInside] = useState(false);
    const [focusInside, setFocusInside] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [preferredWidth, setPreferredWidthState] = useState(COPILOT_SIDEBAR_DEFAULT_WIDTH);
    const [viewportWidth, setViewportWidth] = useState(1440);

    useEffect(() => {
        setPinnedState(window.localStorage.getItem(PINNED_STORAGE_KEY) !== 'false');
        setPreferredWidthState(parseStoredCopilotSidebarWidth(window.localStorage.getItem(WIDTH_STORAGE_KEY)));

        const updateViewportWidth = () => setViewportWidth(window.innerWidth);
        updateViewportWidth();
        window.addEventListener('resize', updateViewportWidth);
        return () => window.removeEventListener('resize', updateViewportWidth);
    }, []);

    const setPinned = useCallback((pinned: boolean) => {
        setPinnedState(pinned);
        window.localStorage.setItem(PINNED_STORAGE_KEY, String(pinned));
    }, []);

    const togglePinned = useCallback(() => {
        if (isPinned) {
            setPointerInside(false);
            setFocusInside(false);
            setIsResizing(false);
        }
        setPinned(!isPinned);
    }, [isPinned, setPinned]);

    const openAndPin = useCallback(() => {
        if (isMobile) {
            setMobileOpen(true);
            return;
        }
        setPinned(true);
    }, [isMobile, setPinned]);

    const setPreferredWidth = useCallback((width: number) => {
        const nextWidth = clampCopilotSidebarWidth(width);
        setPreferredWidthState(nextWidth);
        window.localStorage.setItem(WIDTH_STORAGE_KEY, String(nextWidth));
    }, []);

    const state = isPinned || pointerInside || focusInside || isResizing ? 'expanded' : 'collapsed';
    const effectiveWidth = getEffectiveCopilotSidebarWidth(
        preferredWidth,
        viewportWidth,
        isLeftSidebarPinned ? 256 : COPILOT_SIDEBAR_COLLAPSED_WIDTH
    );
    const layoutWidth = state === 'expanded' ? effectiveWidth : COPILOT_SIDEBAR_COLLAPSED_WIDTH;

    const value = useMemo<OgeemoCopilotSidebarContextValue>(() => ({
        state,
        isPinned,
        isMobile,
        isMobileOpen,
        isResizing,
        preferredWidth,
        effectiveWidth,
        layoutWidth,
        setPinned,
        togglePinned,
        openAndPin,
        setMobileOpen,
        setPointerInside,
        setFocusInside,
        setPreferredWidth,
        setIsResizing,
    }), [
        state,
        isPinned,
        isMobile,
        isMobileOpen,
        isResizing,
        preferredWidth,
        effectiveWidth,
        layoutWidth,
        setPinned,
        togglePinned,
        openAndPin,
        setPreferredWidth,
    ]);

    return (
        <OgeemoCopilotSidebarContext.Provider value={value}>
            {children}
        </OgeemoCopilotSidebarContext.Provider>
    );
}

export function useOgeemoCopilotSidebar() {
    const context = useContext(OgeemoCopilotSidebarContext);
    if (!context) {
        throw new Error('useOgeemoCopilotSidebar must be used within OgeemoCopilotSidebarProvider.');
    }
    return context;
}