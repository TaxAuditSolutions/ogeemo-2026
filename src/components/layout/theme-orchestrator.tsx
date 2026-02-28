'use client';

import { useEffect } from 'react';
import { useUserPreferences } from '@/hooks/use-user-preferences';

/**
 * Converts a Hex color code to an HSL string compatible with Ogeemo's CSS variables.
 * Format: "H S% L%"
 */
function hexToHSL(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Orchestrates the application of global visual identity settings.
 * Injects CSS variables into the document root based on user preferences.
 */
export function ThemeOrchestrator() {
  const { preferences, isLoading } = useUserPreferences();

  useEffect(() => {
    if (isLoading || !preferences?.themeColors) return;

    const root = document.documentElement;
    const colors = preferences.themeColors;

    if (colors.primary) {
      root.style.setProperty('--primary', hexToHSL(colors.primary));
    }
    if (colors.background) {
      root.style.setProperty('--background', hexToHSL(colors.background));
      // Sync card background for consistency
      root.style.setProperty('--card', hexToHSL(colors.background));
    }
    if (colors.sidebar) {
      root.style.setProperty('--sidebar-background', hexToHSL(colors.sidebar));
    }
    if (colors.border) {
      root.style.setProperty('--border', hexToHSL(colors.border));
    }
    if (colors.header) {
      root.style.setProperty('--header-bg', colors.header);
    }

  }, [preferences, isLoading]);

  return null;
}
