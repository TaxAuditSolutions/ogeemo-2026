'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  LoaderCircle, Plus, MoreVertical, Trash2, StickyNote, Search, Pencil, Edit,
  ArrowUp, ArrowDown, ChevronsUpDown, Cloud, ExternalLink,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  listUserNotes, saveUserNote, createUserNote, getUserNoteFromServer, deleteUserNotes, renameUserNote, type UserNote,
} from '@/services/user-notes-service';
import { format } from 'date-fns';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function toTime(value?: Date): number {
  return value?.getTime() ?? 0;
}

type SortColumn = 'subject' | 'user' | 'date';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

function SortableHeader({ label, column, sortConfig, onSort }: {
  label: string;
  column: SortColumn;
  sortConfig: SortConfig;
  onSort: (column: SortColumn) => void;
}) {
  const active = sortConfig.column === column;
  const Icon = !active ? ChevronsUpDown : sortConfig.direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 hover:text-foreground"
        title={`Sort by ${label}`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? 'text-foreground' : 'text-muted-foreground/60'}`} />
      </button>
    </TableHead>
  );
}

export default function UserNotesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [notes, setNotes] = useState<UserNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'date', direction: 'desc' });
  const [isCreating, setIsCreating] = useState(false);
  const [notesPendingDelete, setNotesPendingDelete] = useState<UserNote[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [noteToRename, setNoteToRename] = useState<UserNote | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Guards against state updates after a navigation unmounts this page, and
  // lets a deferred navigation be cancelled if the user leaves first.
  const isMountedRef = useRef(true);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    };
  }, []);

  const ownerLabel = user?.email || 'You';

  const loadNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setNotes(await listUserNotes(user.uid));
    } catch (error: any) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = notes.filter(
      (note) => !query || note.title.toLowerCase().includes(query) || note.content.toLowerCase().includes(query)
    );
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    const sorted = [...filtered];
    switch (sortConfig.column) {
      case 'subject':
        sorted.sort((a, b) => dir * a.title.localeCompare(b.title) || toTime(b.updatedAt) - toTime(a.updatedAt));
        break;
      case 'user':
        sorted.sort((a, b) => dir * (a.userId || '').localeCompare(b.userId || '') || toTime(b.updatedAt) - toTime(a.updatedAt));
        break;
      case 'date':
      default:
        sorted.sort((a, b) => dir * (toTime(a.updatedAt ?? a.createdAt) - toTime(b.updatedAt ?? b.createdAt)));
        break;
    }
    return sorted;
  }, [notes, searchQuery, sortConfig]);

  const handleSort = (column: SortColumn) => {
    setSortConfig((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { column, direction: column === 'date' ? 'desc' : 'asc' }
    );
  };

  const handleNewNote = async () => {
    if (!user || isCreating) return;
    setIsCreating(true);
    try {
      const entry = createUserNote('');
      await saveUserNote(user.uid, entry);
      // setDoc resolves on the local cache — require true server persistence
      // before navigating so the editor never opens on a phantom note.
      let verified = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (await getUserNoteFromServer(user.uid, entry.id)) {
          verified = true;
          break;
        }
      }
      if (!verified) {
        throw new Error('The note could not be saved to the server. Please check your connection and try again.');
      }
      setNotes((prev) => [entry, ...prev]);
      // Defer the navigation by a tick — pushing synchronously races the
      // re-render below while Next tears this page down.
      navigateTimerRef.current = setTimeout(() => router.push(`/user-notes/${entry.id}`), 50);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not create note', description: error.message });
    } finally {
      // The deferred navigation may already have unmounted this page —
      // only update state if it is still mounted.
      if (isMountedRef.current) setIsCreating(false);
    }
  };

  const handleRenameSave = async () => {
    if (!user || !noteToRename) return;
    try {
      await renameUserNote(user.uid, noteToRename.id, renameValue);
      setNotes((prev) => prev.map((n) => (
        n.id === noteToRename.id ? { ...n, title: renameValue.trim(), updatedAt: new Date() } : n
      )));
      setNoteToRename(null);
      toast({ title: 'Note Renamed' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Rename failed', description: error.message });
    }
  };

  const handleDelete = async () => {
    if (!user || !notesPendingDelete?.length) return;
    const deletedIds = new Set(notesPendingDelete.map((note) => note.id));
    try {
      await deleteUserNotes(user.uid, notesPendingDelete.map((note) => note.id));
      setNotes((prev) => prev.filter((n) => !deletedIds.has(n.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      setNotesPendingDelete(null);
      toast({ title: notesPendingDelete.length === 1 ? 'Note Deleted' : `${notesPendingDelete.length} Notes Deleted` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
    }
  };

  const toggleSelectOne = (noteId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(noteId);
      else next.delete(noteId);
      return next;
    });
  };

  const allVisibleSelected = visibleNotes.length > 0 && visibleNotes.every((note) => selectedIds.has(note.id));
  const someVisibleSelected = visibleNotes.some((note) => selectedIds.has(note.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleNotes.forEach((note) => next.delete(note.id));
      } else {
        visibleNotes.forEach((note) => next.add(note.id));
      }
      return next;
    });
  };

  const handleBulkDeleteRequest = () => {
    const selectedNotes = notes.filter((note) => selectedIds.has(note.id));
    if (selectedNotes.length === 0) return;
    setNotesPendingDelete(selectedNotes);
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 h-full overflow-y-auto">
        <header className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                <StickyNote className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-headline text-primary">User Notes</h1>
            <p className="text-sm text-muted-foreground">
                Your personal notes — click a subject to open it.
            </p>
        </header>

        <div className="mx-auto mb-4 flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by subject or text..."
              className="pl-10"
            />
          </div>
          <Button onClick={handleNewNote} disabled={isCreating}>
            {isCreating ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            New Note
          </Button>
          <p className="hidden text-xs text-muted-foreground sm:block sm:w-[240px]">
            Click a column header to sort. Click a subject to open the note.
          </p>
          <p className="text-xs text-muted-foreground sm:w-[240px]">
            Click a column header to sort. Click a subject to open the note.
          </p>
        </div>

        {selectedIds.size > 0 && notes.length > 0 && (
          <div className="mx-auto mb-4 flex max-w-6xl items-center justify-between rounded-md border bg-muted/40 px-4 py-2">
            <p className="text-sm font-medium">
              {selectedIds.size} note{selectedIds.size === 1 ? '' : 's'} selected
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDeleteRequest}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete selected
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <Card className="mx-auto max-w-6xl">
            <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <StickyNote className="h-6 w-6 text-primary" />
              </div>
              <p className="text-muted-foreground">
                No notes yet. Click New Note to start writing — your note saves when you click Save Note.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="mx-auto max-w-6xl">
            <CardContent className="p-0">
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                          onCheckedChange={() => toggleSelectAll()}
                          aria-label="Select all notes"
                        />
                      </TableHead>
                      <SortableHeader label="Subject" column="subject" sortConfig={sortConfig} onSort={handleSort} />
                      <SortableHeader label="User" column="user" sortConfig={sortConfig} onSort={handleSort} />
                      <SortableHeader label="Date" column="date" sortConfig={sortConfig} onSort={handleSort} />
                      <TableHead className="w-[70px]"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleNotes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No notes match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleNotes.map((note) => (
                        <TableRow key={note.id} className={cn('hover:bg-muted/40', selectedIds.has(note.id) && 'bg-muted/40')}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(note.id)}
                              onCheckedChange={(checked) => toggleSelectOne(note.id, checked === true)}
                              aria-label={`Select ${note.title || 'Untitled Note'}`}
                            />
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => router.push(`/user-notes/${note.id}`)}
                              className="flex items-center gap-2 text-left hover:underline"
                              title={note.title || 'Untitled Note'}
                            >
                              <StickyNote className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="max-w-[420px] truncate font-medium">
                                {note.title || 'Untitled Note'}
                              </span>
                              {note.driveFileId && (
                                <span title="Synced to Google Drive" className="shrink-0">
                                  <Cloud className="h-3.5 w-3.5 text-emerald-600" />
                                </span>
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-muted-foreground" title={ownerLabel}>
                            {ownerLabel}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {format(new Date(note.updatedAt ?? note.createdAt ?? new Date()), 'PPp')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => router.push(`/user-notes/${note.id}`)}>
                                  <Edit className="mr-2 h-4 w-4" /> Open
                                </DropdownMenuItem>
                                {note.driveFileId && (
                                  <DropdownMenuItem onSelect={() => window.open(`https://drive.google.com/file/d/${note.driveFileId}/view`, '_blank', 'noopener,noreferrer')}>
                                    <ExternalLink className="mr-2 h-4 w-4" /> Open in Drive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => { setNoteToRename(note); setRenameValue(note.title); }}>
                                  <Pencil className="mr-2 h-4 w-4" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setNotesPendingDelete([note])} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={!!noteToRename} onOpenChange={(open) => { if (!open) setNoteToRename(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Note</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="rename-note">Subject</Label>
            <Input
              id="rename-note"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSave(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteToRename(null)}>Cancel</Button>
            <Button onClick={handleRenameSave}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!notesPendingDelete} onOpenChange={() => setNotesPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {notesPendingDelete?.length === 1
                ? `This will permanently delete the note "${notesPendingDelete[0].title || 'Untitled Note'}".`
                : `This will permanently delete ${notesPendingDelete?.length ?? 0} notes.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}