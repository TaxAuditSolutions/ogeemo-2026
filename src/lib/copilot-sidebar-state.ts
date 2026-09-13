export const COPILOT_SIDEBAR_DEFAULT_WIDTH = 300;
export const COPILOT_SIDEBAR_MIN_WIDTH = 240;
export const COPILOT_SIDEBAR_MAX_WIDTH = 600;
export const COPILOT_SIDEBAR_COLLAPSED_WIDTH = 48;
export const COPILOT_SIDEBAR_MIN_MAIN_WIDTH = 320;

export function clampCopilotSidebarWidth(width: number): number {
    if (!Number.isFinite(width)) {
        return COPILOT_SIDEBAR_DEFAULT_WIDTH;
    }

    return Math.min(
        COPILOT_SIDEBAR_MAX_WIDTH,
        Math.max(COPILOT_SIDEBAR_MIN_WIDTH, Math.round(width))
    );
}

export function parseStoredCopilotSidebarWidth(value: string | null): number {
    if (value === null || value.trim() === '') {
        return COPILOT_SIDEBAR_DEFAULT_WIDTH;
    }

    return clampCopilotSidebarWidth(Number(value));
}

export function getEffectiveCopilotSidebarWidth(
    preferredWidth: number,
    viewportWidth: number,
    leftSidebarWidth = 0
): number {
    const availableWidth = Math.floor(
        viewportWidth - leftSidebarWidth - COPILOT_SIDEBAR_MIN_MAIN_WIDTH
    );

    return Math.max(
        COPILOT_SIDEBAR_COLLAPSED_WIDTH,
        Math.min(clampCopilotSidebarWidth(preferredWidth), availableWidth)
    );
}