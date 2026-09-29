'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, isSameDay } from 'date-fns';
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Info,
  PauseCircle,
  PlayCircle,
  Receipt,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { getTaskById, getTasksForUser, type Event as TaskEvent } from '@/services/project-service';
import { getInvoices, getPayableBills } from '@/core/accounting-service';
import { formatCurrency } from '@/lib/utils';
import type { StoredTimerState } from '@/types/calendar-types';

/**
 * "Current work" panel for the welcome/home screen (beta feedback: the home
 * screen should prioritise the user's business and current work).
 *
 * Renders, when data exists:
 *  - a running-session strip (reads the global `activeTimeManagerEntry`
 *    timer state, same source as ActiveTimerIndicator),
 *  - a "Today" card: today's scheduled events + open task count,
 *  - a "Needs attention" card: unpaid invoices and bills totals.
 *
 * Every data source fails soft (`.catch(() => null)`) and empty cards are
 * hidden, so a quiet account simply shows the workflow cards below.
 */

const TIMER_STORAGE_KEY = 'activeTimeManagerEntry';

/**
 * Sessions started longer ago than this are treated as abandoned for display
 * purposes: they are not "current work", and multi-day stuck timers (e.g.
 * 96:33:16) only confuse the home screen. The session stays visible and
 * endable in the Activity Manager.
 */
const STALE_SESSION_MS = 24 * 60 * 60 * 1000;

type TimerWindow = Window & {
  __ogeemoTimerState?: StoredTimerState | null;
};

function readTimerState(): StoredTimerState | null {
  const timerWindow = window as TimerWindow;
  if (timerWindow.__ogeemoTimerState !== undefined) {
    return timerWindow.__ogeemoTimerState;
  }

  try {
    const rawValue = localStorage.getItem(TIMER_STORAGE_KEY);
    const parsed = rawValue ? (JSON.parse(rawValue) as StoredTimerState) : null;
    timerWindow.__ogeemoTimerState = parsed;
    return parsed;
  } catch (error) {
    console.warn('CurrentWorkPanel: failed to parse timer state.', error);
    timerWindow.__ogeemoTimerState = null;
    return null;
  }
}

function computeElapsedSeconds(timer: StoredTimerState): number {
  const now = Date.now();
  const pausedDelta = timer.isPaused && timer.pauseTime
    ? Math.floor((now - timer.pauseTime) / 1000)
    : 0;
  return Math.max(
    0,
    Math.floor((now - timer.startTime) / 1000) - (timer.totalPausedDuration || 0) - pausedDelta,
  );
}

function formatElapsedSeconds(totalSeconds: number): string {
  const safeTotal = Math.max(0, totalSeconds);
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = safeTotal % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function CurrentWorkPanel() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [todayEvents, setTodayEvents] = useState<TaskEvent[]>([]);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [billCount, setBillCount] = useState(0);
  const [billTotal, setBillTotal] = useState(0);

  const [timer, setTimer] = useState<StoredTimerState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerTitle, setTimerTitle] = useState<string | null>(null);

  // Business data: today's schedule, open tasks, unpaid invoices and bills.
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    (async () => {
      const [tasks, invoices, bills] = await Promise.all([
        getTasksForUser(user.uid).catch(() => null),
        getInvoices(user.uid).catch(() => null),
        getPayableBills(user.uid).catch(() => null),
      ]);

      if (!isMounted) return;

      if (tasks) {
        const now = new Date();
        const openTasks = tasks.filter((task) => task.status !== 'done');
        setOpenTaskCount(openTasks.length);
        setTodayEvents(
          openTasks
            .filter((task): task is TaskEvent =>
              Boolean(task.isScheduled) && task.start instanceof Date && isSameDay(task.start, now),
            )
            .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0))
            .slice(0, 3),
        );
      }

      if (invoices) {
        const unpaid = invoices.filter(
          (invoice) => invoice.originalAmount - (invoice.amountPaid || 0) > 0.009,
        );
        setInvoiceCount(unpaid.length);
        setInvoiceTotal(
          unpaid.reduce((sum, invoice) => sum + (invoice.originalAmount - (invoice.amountPaid || 0)), 0),
        );
      }

      if (bills) {
        setBillCount(bills.length);
        setBillTotal(bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0));
      }

      setLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Running session: mirrors ActiveTimerIndicator's read/tick behaviour.
  useEffect(() => {
    const readTimer = () => {
      const nextState = readTimerState();
      setTimer(nextState);

      if (!nextState?.isActive) {
        setElapsedSeconds(0);
        return;
      }
      setElapsedSeconds(computeElapsedSeconds(nextState));
    };

    readTimer();
    const onStorageSync = () => readTimer();
    window.addEventListener('storage', onStorageSync);
    window.addEventListener('timer-state-changed', onStorageSync as EventListener);
    const intervalId = window.setInterval(readTimer, 1000);

    return () => {
      window.removeEventListener('storage', onStorageSync);
      window.removeEventListener('timer-state-changed', onStorageSync as EventListener);
      window.clearInterval(intervalId);
    };
  }, []);

  // Resolve the running event's title for the strip (best effort).
  useEffect(() => {
    if (!timer?.isActive || !timer.eventId) {
      setTimerTitle(null);
      return;
    }

    let isMounted = true;
    getTaskById(timer.eventId)
      .then((task) => {
        if (isMounted) setTimerTitle(task?.title ?? null);
      })
      .catch(() => {
        if (isMounted) setTimerTitle(null);
      });

    return () => {
      isMounted = false;
    };
  }, [timer?.isActive, timer?.eventId]);

  const timerActive = Boolean(
    timer?.isActive && Date.now() - timer.startTime <= STALE_SESSION_MS,
  );
  const staleSession = Boolean(timer?.isActive) && !timerActive;
  const showTodayCard = todayEvents.length > 0 || openTaskCount > 0;
  const showAttentionCard = invoiceCount > 0 || billCount > 0;

  if (!loading && !timerActive && !staleSession && !showTodayCard && !showAttentionCard) {
    return null;
  }

  return (
    <div className="space-y-4">
      {timerActive && (
        <Link
          href={timer?.eventId ? `/event-manager?eventId=${timer.eventId}` : '/event-manager'}
          className="group flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm shadow-sm transition-colors hover:bg-primary/10"
        >
          {timer?.isPaused ? (
            <PauseCircle className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
          )}
          <span className="shrink-0 font-semibold">
            {timer?.isPaused ? 'Session paused' : 'Session running'}
          </span>
          <span className="min-w-0 truncate text-muted-foreground">
            {timerTitle || 'Your current task'}
          </span>
          <span className="ml-auto shrink-0 font-mono font-semibold tabular-nums">
            {formatElapsedSeconds(elapsedSeconds)}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      )}

      {staleSession && timer && (
        <Link
          href={timer.eventId ? `/event-manager?eventId=${timer.eventId}` : '/event-manager'}
          className="group flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-muted/70"
        >
          <Info className="h-4 w-4 shrink-0" />
          <span className="shrink-0 font-semibold">Older session</span>
          <span className="min-w-0 truncate">
            started {format(timer.startTime, 'MMM d, HH:mm')} — open the Activity Manager to end it
          </span>
          <ArrowRight className="ml-auto h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="h-36 animate-pulse rounded-2xl border bg-card" />
          ))}
        </div>
      ) : (
        (showTodayCard || showAttentionCard) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {showTodayCard && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Today
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {todayEvents.length === 0 ? (
                    <p className="px-1 pb-2 text-muted-foreground">Nothing scheduled today.</p>
                  ) : (
                    todayEvents.map((event) => (
                      <Link
                        key={event.id}
                        href="/calendar"
                        className="group flex items-center gap-3 rounded-md px-1 py-1 hover:bg-muted/60"
                      >
                        <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                          {event.start ? format(event.start, 'HH:mm') : ''}
                        </span>
                        <span className="truncate">{event.title}</span>
                        <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    ))
                  )}
                  {openTaskCount > 0 && (
                    <Link
                      href="/action-manager"
                      className="group flex items-center gap-2 rounded-md px-1 py-1 pt-2 hover:bg-muted/60"
                    >
                      <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
                      <span>
                        {openTaskCount} open task{openTaskCount === 1 ? '' : 's'}
                      </span>
                      <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}

            {showAttentionCard && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    <CircleDollarSign className="h-4 w-4 text-primary" />
                    Needs attention
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {invoiceCount > 0 && (
                    <Link
                      href="/accounting/accounts-receivable"
                      className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/60"
                    >
                      <Receipt className="h-4 w-4 shrink-0 text-primary" />
                      <span>
                        {invoiceCount} unpaid invoice{invoiceCount === 1 ? '' : 's'}
                      </span>
                      <span className="ml-auto shrink-0 font-semibold">
                        {formatCurrency(invoiceTotal)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  )}
                  {billCount > 0 && (
                    <Link
                      href="/accounting/accounts-payable"
                      className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/60"
                    >
                      <Receipt className="h-4 w-4 shrink-0 text-primary" />
                      <span>
                        {billCount} unpaid bill{billCount === 1 ? '' : 's'}
                      </span>
                      <span className="ml-auto shrink-0 font-semibold">
                        {formatCurrency(billTotal)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )
      )}
    </div>
  );
}
