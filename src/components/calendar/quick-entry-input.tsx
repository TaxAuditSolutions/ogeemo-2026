'use client';

import * as React from 'react';
import { Maximize2 } from 'lucide-react';
import { MAX_QUICK_TITLE } from '@/lib/calendar-quick-entry';

interface QuickEntryInputProps {
  placeholder?: string;
  /** Saves one entry. Resolves true when it was saved, false when it failed (the text is then kept). */
  onSave: (title: string) => Promise<boolean>;
  /** Opens the Activity Manager for this entry (saving it first when text was typed). */
  onExpand: (title: string) => Promise<void> | void;
  onClose: () => void;
}

/**
 * One-line entry shown inside a calendar slot. Enter saves the line and the box stays open for
 * the next one; Esc closes without saving; clicking away saves what was typed so nothing is lost.
 */
export function QuickEntryInput({ placeholder = 'Type a to-do, press Enter', onSave, onExpand, onClose }: QuickEntryInputProps) {
  const [value, setValue] = React.useState('');
  const busyRef = React.useRef(false);

  const commit = async (): Promise<boolean> => {
    const text = value.trim();
    if (!text || busyRef.current) return true;
    busyRef.current = true;
    setValue('');
    try {
      const saved = await onSave(text);
      if (!saved) setValue(text);
      return saved;
    } finally {
      busyRef.current = false;
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const handleBlur = async () => {
    if (!value.trim()) {
      onClose();
      return;
    }
    if (await commit()) onClose();
  };

  return (
    <div data-quick-entry className="flex w-full items-center gap-1 rounded-md border border-primary bg-white p-0.5 shadow-sm">
      <input
        autoFocus
        type="text"
        value={value}
        maxLength={MAX_QUICK_TITLE}
        placeholder={placeholder}
        aria-label="Quick calendar entry"
        className="min-w-0 flex-1 bg-transparent px-1.5 py-1 text-xs outline-none placeholder:text-muted-foreground"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      <button
        type="button"
        title="Open in the Activity Manager for more detail"
        aria-label="Open in the Activity Manager"
        className="flex-shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        // Keep the text box focused so clicking this does not trigger the save-on-blur first.
        onMouseDown={(event) => event.preventDefault()}
        onClick={async () => {
          const text = value.trim();
          setValue('');
          await onExpand(text);
          onClose();
        }}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
