'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoaderCircle, Save, ArrowLeft, StickyNote, Printer, Info, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getUserNote, saveUserNote, deleteUserNote, deriveNoteTitle, type UserNote } from '@/services/user-notes-service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function NoteEditorPage() {
    const params = useParams<{ id: string }>();
    const noteId = params?.id ?? '';
    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [baselineTitle, setBaselineTitle] = useState('');
    const [baselineContent, setBaselineContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Guards against state updates after the route change unmounts this page,
    // and lets a deferred navigation be cancelled if the user leaves first.
    const isMountedRef = useRef(true);
    const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
        };
    }, []);

    const isDirty = title !== baselineTitle || content !== baselineContent;

    const loadNote = useCallback(async () => {
        setIsLoading(true);
        setNotFound(false);
        // Firebase Auth may still be restoring the session (e.g. after a page
        // refresh straight onto this URL). Wait for it — the effect re-runs
        // automatically once `user` arrives.
        if (!user || !noteId) {
            return;
        }
        try {
            let note: UserNote | null = null;
            // A brand-new note may briefly be invisible to a direct server
            // read (the write lands on the local cache first), so retry a
            // few times before declaring it missing.
            for (let attempt = 0; attempt < 3; attempt++) {
                note = await getUserNote(user.uid, noteId);
                if (note) break;
                if (attempt < 2) {
                    await new Promise((resolve) => setTimeout(resolve, 400));
                }
            }
            if (!note) {
                setNotFound(true);
                return;
            }
            setTitle(note.title || '');
            setContent(note.content || '');
            setBaselineTitle(note.title || '');
            setBaselineContent(note.content || '');
        } catch (error: any) {
            console.error('Failed to load note:', error);
            setNotFound(true);
        } finally {
            setIsLoading(false);
        }
    }, [noteId, user]);

    useEffect(() => {
        loadNote();
    }, [loadNote]);

    const handleSave = useCallback(async () => {
        if (isSaving || !user || !noteId || !isDirty) return;
        setIsSaving(true);
        try {
            const trimmedTitle = title.trim() || deriveNoteTitle(content);
            await saveUserNote(user.uid, { id: noteId, title: trimmedTitle, content, userId: user.uid });
            toast({ title: 'Note Saved', description: `"${trimmedTitle}" has been stored.` });
            // Defer the navigation by a tick: pushing synchronously here races
            // the spinner-swap re-render below while Next tears this page down,
            // which crashes with "insertBefore ... not a child of this node".
            navigateTimerRef.current = setTimeout(() => router.push('/user-notes'), 50);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            // The deferred navigation may already have unmounted this page —
            // only update state if it is still mounted.
            if (isMountedRef.current) setIsSaving(false);
        }
    }, [isSaving, user, noteId, title, content, isDirty, router, toast]);

    // Ctrl/Cmd + S saves from anywhere on the page (same as the Save button:
    // store the note, then return to the User Notes landing page).
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    });

    // Prints the current editor content through a hidden, print-styled iframe —
    // only the note (subject + content + timestamp) goes on paper, never the
    // app chrome. Works even when the latest typing has not been saved yet.
    const handlePrint = useCallback(() => {
        const printSubject = title.trim() || deriveNoteTitle(content);

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
            iframe.remove();
            return;
        }

        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
<head>
<title>${escapeHtml(printSubject)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.5; margin: 24px; }
  .pn-subject { font-size: 20px; font-weight: 700; margin: 0 0 2px; }
  .pn-meta { font-size: 11px; color: #555; margin: 0 0 18px; }
  .pn-body { white-space: pre-wrap; overflow-wrap: break-word; font-size: 13px; }
</style>
</head>
<body>
  <div class="pn-subject">${escapeHtml(printSubject)}</div>
  <div class="pn-meta">Printed ${format(new Date(), 'PPp')}</div>
  <div class="pn-body">${escapeHtml(content)}</div>
</body>
</html>`);
        doc.close();

        const cleanup = () => iframe.remove();
        iframe.contentWindow?.addEventListener('afterprint', cleanup);
        setTimeout(cleanup, 60000);

        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
    }, [title, content]);

    const handleLeaveWithoutSaving = () => {
        // Deferred by a tick so the state update commits before the route
        // change tears this page down (avoids the insertBefore race).
        navigateTimerRef.current = setTimeout(() => router.push('/user-notes'), 50);
    };

    const handleCancel = () => {
        if (isDirty) {
            setIsCancelConfirmOpen(true);
            return;
        }
        // A brand-new note that was never filled in shouldn't linger as an
        // empty "Untitled Note" — clean it up on the way out.
        if (user && noteId && !baselineTitle.trim() && !baselineContent.trim()) {
            deleteUserNote(user.uid, noteId).catch((error: any) => {
                console.error('Failed to clean up empty note:', error);
            });
        }
        handleLeaveWithoutSaving();
    };

    const handleDiscard = async () => {
        setIsCancelConfirmOpen(false);
        try {
            if (user && noteId && !baselineTitle.trim() && !baselineContent.trim()) {
                await deleteUserNote(user.uid, noteId);
            }
        } catch (error: any) {
            console.error('Failed to clean up empty note:', error);
        }
        handleLeaveWithoutSaving();
    };

    const handleDeleteRequest = () => {
        setIsDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (isDeleting || !user || !noteId) return;
        setIsDeleting(true);
        try {
            await deleteUserNote(user.uid, noteId);
            toast({ title: 'Note Deleted', description: `"${title.trim() || deriveNoteTitle(content)}" has been deleted.` });
            navigateTimerRef.current = setTimeout(() => router.push('/user-notes'), 50);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
        } finally {
            if (isMountedRef.current) setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-muted-foreground">This note could not be found, or you do not have access to it.</p>
                <Button asChild variant="outline">
                    <Link href="/user-notes">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to User Notes
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 h-full overflow-y-auto">
            <div className="mx-auto max-w-3xl">
                <div className="mb-4 flex items-center justify-between gap-2">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/user-notes">
                            <ArrowLeft className="mr-2 h-4 w-4" /> User Notes
                        </Link>
                    </Button>
                    <span className={`text-xs ${isDirty ? 'font-medium text-amber-600' : 'text-muted-foreground'}`}>
                        {isDirty
                            ? 'Unsaved changes — click Save Note (or press Ctrl+S) to save and return'
                            : 'No new changes'}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancel}
                        disabled={isSaving}
                        aria-label="Close and return to User Notes"
                        title="Close"
                        className="text-muted-foreground hover:text-destructive"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <StickyNote className="h-5 w-5 text-primary" /> Create/Edit Note
                        </CardTitle>
                        <CardDescription>
                            Write your note, then click Save Note to store it and return to the User Notes page.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="note-title">Subject</Label>
                            <Input
                                id="note-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Note subject"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="note-content">Content</Label>
                            <Textarea
                                id="note-content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={18}
                                className="min-h-[400px] resize-y font-mono text-sm leading-relaxed"
                                placeholder="Write your note here..."
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {content.length} character{content.length === 1 ? '' : 's'}
                        </p>
                        <div className="flex items-center gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span
                                            className="flex h-9 cursor-help items-center justify-center rounded-md px-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                            aria-label="How to keep a PDF copy in Google Drive"
                                        >
                                            <Info className="h-4 w-4" />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                        <p className="font-semibold text-foreground">Keep a PDF copy in Google Drive</p>
                                        <p className="text-foreground/90">
                                            Click Print → set the destination to &quot;Save as PDF&quot; → click Save →
                                            choose your Google Drive notes folder as the location.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Button variant="outline" onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteRequest} disabled={isSaving || isDeleting}>
                                {isDeleting ? (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete
                            </Button>
                            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                                {isSaving ? (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                {isSaving ? 'Saving...' : 'Save Note'}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
            <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard changes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This note has unsaved changes. If you discard them, they will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDiscard} className="bg-destructive hover:bg-destructive/90">
                            Discard changes
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete &quot;{title.trim() || deriveNoteTitle(content)}&quot; and its saved
                            content. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}