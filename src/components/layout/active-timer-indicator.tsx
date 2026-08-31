'use client';

import { useEffect, useState } from 'react';
import { Clock3, PauseCircle, PlayCircle } from 'lucide-react';
import type { StoredTimerState } from '@/types/calendar-types';

const TIMER_STORAGE_KEY = 'activeTimeManagerEntry';

type TimerWindow = Window & {
  __ogeemoTimerState?: StoredTimerState | null;
};

function getLiveTimerState(): StoredTimerState | null {
  const timerWindow = window as TimerWindow;
  if (timerWindow.__ogeemoTimerState) {
    return timerWindow.__ogeemoTimerState;
  }

  try {
    const rawValue = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!rawValue) {
      timerWindow.__ogeemoTimerState = null;
      return null;
    }

    const parsed = JSON.parse(rawValue) as StoredTimerState;
    timerWindow.__ogeemoTimerState = parsed;
    return parsed;
  } catch (error) {
    console.warn('ActiveTimerIndicator: failed to parse timer state.', error);
    timerWindow.__ogeemoTimerState = null;
    return null;
  }
}

function formatElapsedSeconds(totalSeconds: number) {
  const safeTotal = Math.max(0, totalSeconds);
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = safeTotal % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export const ActiveTimerIndicator = () => {
  const [timerState, setTimerState] = useState<StoredTimerState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const readTimerState = () => {
      const nextState = getLiveTimerState();
      setTimerState(nextState);

      if (!nextState?.isActive) {
        setElapsedSeconds(0);
        return;
      }

      const now = Date.now();
      const pausedDelta = nextState.isPaused && nextState.pauseTime ? Math.floor((now - nextState.pauseTime) / 1000) : 0;
      const computedSeconds = Math.max(0, Math.floor((now - nextState.startTime) / 1000) - (nextState.totalPausedDuration || 0) - pausedDelta);
      setElapsedSeconds(computedSeconds);
    };

    readTimerState();
    const onStorageSync = () => readTimerState();
    window.addEventListener('storage', onStorageSync);
    window.addEventListener('timer-state-changed', onStorageSync as EventListener);
    const intervalId = window.setInterval(readTimerState, 1000);

    return () => {
      window.removeEventListener('storage', onStorageSync);
      window.removeEventListener('timer-state-changed', onStorageSync as EventListener);
      window.clearInterval(intervalId);
    };
  }, []);

  if (!timerState) {
    return (
      <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 shadow-sm backdrop-blur-sm">
        <Clock3 className="h-3 w-3" />
        <span>Idle</span>
      </div>
    );
  }

  if (!timerState.isActive) {
    return (
      <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 shadow-sm backdrop-blur-sm">
        <Clock3 className="h-3 w-3" />
        <span>Ready</span>
      </div>
    );
  }

  return (
    <div className="hidden sm:flex items-center gap-2 rounded-full border border-black/10 bg-white/35 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 shadow-sm backdrop-blur-sm">
      {timerState.isPaused ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
      <Clock3 className="h-3 w-3" />
      <span>{formatElapsedSeconds(elapsedSeconds)}</span>
      <span className="text-[8px] opacity-75">{timerState.isPaused ? 'Paused' : 'Live'}</span>
    </div>
  );
};
