'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { allMenuItems } from '@/lib/menu-items';

/**
 * The universal "last page visited" back link, rendered by the app layout at
 * the top of every page's content (beta feedback: keep one consistent style
 * and have every page show where the user just came from). The trail lives in
 * sessionStorage so it survives the full-page reloads used by workspace
 * switches, auth redirects and post-save jumps. Hidden when there is no
 * previous page in this tab (first landing / brand-new tab), and hidden while
 * the page itself offers a "Back to" link to the same destination — checked
 * with a MutationObserver because page-level headers often render after async
 * data loads, so a one-shot check would miss them.
 */

const NAV_TRAIL_KEY = 'ogeemo-nav-trail';

function readTrail(): string[] {
  try {
    const raw = window.sessionStorage.getItem(NAV_TRAIL_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
  } catch {
    return [];
  }
}

function writeTrail(trail: string[]): void {
  try {
    window.sessionStorage.setItem(NAV_TRAIL_KEY, JSON.stringify(trail.slice(-25)));
  } catch {
    // Storage unavailable — the link simply hides until the next soft navigation.
  }
}

function labelForPath(pathname: string): string {
  const known = allMenuItems.find((item) => item.href === pathname);
  if (known) return known.label;
  const segment = pathname.split('/').filter(Boolean).pop();
  if (!segment) return 'home';
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function LastPageBack() {
  const pathname = usePathname();
  const [previousPath, setPreviousPath] = useState<string | null>(null);
  const [isDuplicated, setIsDuplicated] = useState(false);

  useEffect(() => {
    const trail = readTrail();
    const last = trail[trail.length - 1] ?? null;
    if (last === pathname) {
      // Same page after a reload or re-render — the entry before it is the previous page.
      setPreviousPath(trail.length >= 2 ? trail[trail.length - 2] : null);
      return;
    }
    // New page via soft or hard navigation — remember where we came from.
    if (last) setPreviousPath(last);
    writeTrail([...trail, pathname]);
  }, [pathname]);

  // Defer to the page: while the current page offers its own "Back to <same
  // destination>" link, do not repeat it here. Re-checked on DOM mutations
  // because page headers frequently render only after async data arrives.
  useEffect(() => {
    if (!previousPath) {
      setIsDuplicated(false);
      return;
    }
    const check = () => {
      const container = document.getElementById('last-page-back');
      const ownLabel = `Back to ${labelForPath(previousPath)}`.toLowerCase();
      const candidates = Array.from(document.querySelectorAll('main a[href], main button'));
      const found = candidates.some((element) => {
        if (container?.contains(element)) return false;
        const text = (element.textContent || '').trim().toLowerCase();
        if (!text.startsWith('back to ')) return false;
        const href = element.getAttribute('href');
        if (href && href === previousPath) return true;
        return text === ownLabel;
      });
      setIsDuplicated(found);
    };
    check();
    const observer = new MutationObserver(check);
    const mainElement = document.querySelector('main');
    if (mainElement) {
      observer.observe(mainElement, { childList: true, subtree: true, characterData: true });
    }
    return () => observer.disconnect();
  }, [previousPath, pathname]);

  if (!previousPath || previousPath === pathname || isDuplicated) return null;

  return (
    <div id="last-page-back" className="print:hidden">
      <Button asChild variant="outline" size="sm">
        <Link href={previousPath} aria-label={`Back to ${labelForPath(previousPath)}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {labelForPath(previousPath)}
        </Link>
      </Button>
    </div>
  );
}
