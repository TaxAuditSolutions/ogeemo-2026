
'use client';

import { useEffect } from 'react';
import { useUserPreferences } from '@/hooks/use-user-preferences';

/**
 * Converts a Hex color code to HSL components and a formatted string values.
 * Format: { h, s, l, values: "H S% L%" }
 */
function hexToHSLData(hex: string) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || (hex.length !== 4 && hex.length !== 7)) {
      return { h: 0, s: 0, l: 0, values: "0 0% 0%" };
  }

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

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return {
    h: hDeg,
    s: sPct,
    l: lPct,
    values: `${hDeg} ${sPct}% ${lPct}%`
  };
}

/**
 * Orchestrates the application of global visual identity settings.
 * Injects CSS variables into the document root based on user preferences.
 * Calculates optimal contrast for readability during both idle and hover states.
 */
export function ThemeOrchestrator() {
  const { preferences, isLoading } = useUserPreferences();

  useEffect(() => {
    if (isLoading || !preferences?.themeColors) return;

    const root = document.documentElement;
    const colors = preferences.themeColors;

    // 1. Primary Branding
    if (colors.primary) {
      const hsl = hexToHSLData(colors.primary);
      root.style.setProperty('--primary', hsl.values);
      // High contrast text for primary background (buttons, badges)
      root.style.setProperty('--primary-foreground', hsl.l > 65 ? '0 0% 0%' : '0 0% 100%');
    }

    // 2. Workspace Surface (Background)
    if (colors.background) {
      const hsl = hexToHSLData(colors.background);
      root.style.setProperty('--background', hsl.values);
      root.style.setProperty('--card', hsl.values);
      root.style.setProperty('--popover', hsl.values);
      // High contrast text for main workspace
      root.style.setProperty('--foreground', hsl.l > 60 ? '222.2 84% 4.9%' : '210 20% 98%');
      root.style.setProperty('--card-foreground', hsl.l > 60 ? '222.2 84% 4.9%' : '210 20% 98%');
    }

    // 3. Navigation Strip (Sidebar)
    if (colors.sidebar) {
      const hsl = hexToHSLData(colors.sidebar);
      root.style.setProperty('--sidebar-background', hsl.values);
      
      // CRITICAL CONTRAST: If background is light, use dark text. If dark, use light text.
      const isLight = hsl.l > 60;
      const foreground = isLight ? '240 5.9% 10%' : '240 4.8% 95.9%';
      const mutedForeground = isLight ? '240 3.8% 46.1%' : '240 5% 64.9%';
      
      // Calculate a distinct hover background (accent) that maintains contrast
      const accentL = isLight ? Math.max(0, hsl.l - 8) : Math.min(100, hsl.l + 12);
      const accentValues = `${hsl.h} ${hsl.s}% ${accentL}%`;

      root.style.setProperty('--sidebar-foreground', foreground);
      root.style.setProperty('--sidebar-primary-foreground', isLight ? '0 0% 100%' : '0 0% 0%');
      root.style.setProperty('--sidebar-accent', accentValues);
      root.style.setProperty('--sidebar-accent-foreground', foreground);
      root.style.setProperty('--sidebar-muted-foreground', mutedForeground);
    }

    // 4. Audit Borders
    if (colors.border) {
      const hsl = hexToHSLData(colors.border);
      root.style.setProperty('--border', hsl.values);
      root.style.setProperty('--input', hsl.values);
      root.style.setProperty('--sidebar-border', hsl.values);
    }

    // 5. Command Bar (Header)
    if (colors.header) {
      root.style.setProperty('--header-bg', colors.header);
    }

  }, [preferences, isLoading]);

  return null;
}
