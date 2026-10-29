'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const LEAVE_MESSAGE = 'You have unsaved changes. Leave without saving?';

/**
 * Unsaved-changes protection for the quote/invoice editors.
 *
 * `snapshot()` serializes the form's user-editable state. Call `markClean()`
 * after any load / clear / template / programmatic update - it defers the
 * baseline capture to the next render so React state has committed. Call
 * `markCleanNow()` right before a redirect, where no render will follow.
 *
 * While the form is dirty:
 *  - closing or refreshing the tab prompts (beforeunload);
 *  - ANY internal link click (sidebar, breadcrumbs, hub links) prompts and
 *    routes through the app router after confirmation;
 *  - `confirmLeave()` guards the editors' explicit router buttons and
 *    document switchers (Drafts / Outstanding Quotes).
 *
 * Snapshot consumers should exclude fields that change behind the user's back
 * (e.g. the auto-claimed document number, gated by numberEditedRef) so
 * programmatic updates never mark the form dirty.
 */
export function useUnsavedChangesGuard(snapshot: () => string) {
  const router = useRouter();
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const baselineRef = useRef<string | null>(null);
  const cleanPendingRef = useRef(false);
  const isDirtyRef = useRef<() => boolean>(() => false);

  // Recomputed every render so listeners always read the freshest values.
  isDirtyRef.current = () =>
    baselineRef.current !== null && snapshotRef.current() !== baselineRef.current;

  const markClean = useCallback(() => {
    cleanPendingRef.current = true;
  }, []);

  const markCleanNow = useCallback(() => {
    cleanPendingRef.current = false;
    baselineRef.current = snapshotRef.current();
  }, []);

  const confirmLeave = useCallback(
    () => !isDirtyRef.current() || window.confirm(LEAVE_MESSAGE),
    []
  );

  // Capture the baseline after the next commit - the setters behind the
  // preceding markClean() call (load / clear / template) have landed by then.
  useEffect(() => {
    if (cleanPendingRef.current) {
      cleanPendingRef.current = false;
      baselineRef.current = snapshotRef.current();
    }
  });

  // Tab close, refresh, external navigation.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current()) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Internal link clicks anywhere on the page (sidebar, breadcrumbs, header).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!isDirtyRef.current()) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!href.startsWith('/') || href.startsWith('//')) return;
      e.preventDefault();
      if (window.confirm(LEAVE_MESSAGE)) router.push(href);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [router]);

  return { markClean, markCleanNow, confirmLeave };
}
