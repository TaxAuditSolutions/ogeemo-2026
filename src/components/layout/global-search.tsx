'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { allMenuItems } from '@/lib/menu-items';
import { processCommand } from '@/lib/command-processor';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  label: string;
  target: string;
  hint: string;
}

/**
 * "Jump to a section" palette (Cmd/Ctrl+K) — the single global search entry
 * in the header (navigation tier 2). Matches sidebar sections by label and
 * falls back to the command processor's navigation aliases, so every
 * destination has one predictable home in the sidebar and one fast path here.
 */
export function GlobalSearch({ isOpen, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const { accessLevel, isMasterTenant } = useAuth();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!isOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  const isAdminUser = accessLevel === 'super_admin' || accessLevel === 'org_admin';

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();

    const sections = allMenuItems
      .filter((item) => {
        if (item.adminOnly && !isAdminUser) return false;
        if (item.masterTenantOnly && !(isMasterTenant || accessLevel === 'super_admin')) return false;
        if (!q) return true;
        return item.label.toLowerCase().includes(q);
      })
      .slice(0, q ? 8 : 6)
      .map((item) => ({ label: item.label, target: item.href, hint: item.href }));

    if (!q) return sections;

    let commandResult: SearchResult[] = [];
    try {
      const command = processCommand(query.trim());
      if (command.type !== 'unknown' && command.target) {
        commandResult = [
          {
            label: command.label || command.description || command.message,
            target: command.target,
            hint: command.target,
          },
        ];
      }
    } catch {
      commandResult = [];
    }

    return [...sections, ...commandResult.filter((c) => !sections.some((s) => s.target === c.target))].slice(0, 9);
  }, [query, isAdminUser, isMasterTenant, accessLevel]);

  const navigate = (target: string) => {
    onOpenChange(false);
    if (target.startsWith('http')) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      router.push(target);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const choice = results[activeIndex] || results[0];
      if (choice) navigate(choice.target);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpenChange(true)}
        aria-label="Search sections"
        className="hidden sm:flex h-8 items-center gap-2 rounded-full border border-black/10 bg-white/35 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-800 shadow-sm backdrop-blur-sm hover:bg-white/50 transition-colors"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden md:inline-flex h-5 items-center rounded border border-black/10 bg-white/60 px-1.5 font-mono text-[9px] font-bold">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg gap-0 overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Jump to a section</DialogTitle>
            <DialogDescription>Search sections and quick actions across Ogeemo.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search sections…"
              aria-label="Search sections"
              className="h-12 border-0 px-0 shadow-none focus-visible:ring-0 text-sm"
            />
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No matches. Try a different word.
              </p>
            ) : (
              results.map((result, index) => (
                <button
                  key={`${result.target}-${index}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => navigate(result.target)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm',
                    index === activeIndex
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  <span className="truncate">{result.label}</span>
                  <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground max-w-[45%]">
                    {result.hint}
                  </span>
                </button>
              ))
            )}
          </div>
          <div className="flex gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
            <span>↑ ↓ Choose</span>
            <span>Enter Open</span>
            <span>Esc Close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
