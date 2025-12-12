'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoaderCircle, Plus, MoreVertical, Edit, Trash2, FileText, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getFiles, deleteFiles, updateFile, type FileItem } from '@/services/file-service';
import { getFolders, type FolderItem } from '@/services/file-manager-folders';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";


export default function NotesManagerPage() {
    const [notes, setNotes] = useState<FileItem[]>([]);
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [noteToDelete, setNoteToDelete] = useState<FileItem | null>(null);

    const [fileToLink, setFileToLink] = useState<FileItem | null>(null);
    const [driveLink, setDriveLink] = useState('');
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const loadNotes = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const allFiles = await getFiles(user.uid);
            const allFolders = await getFolders(user.uid);
            // Filter for only text files
            const textNotes = allFiles.filter(file => file.type === 'text/plain' || file.type === 'application/vnd.ogeemo-flowchart+json');
            setNotes(textNotes.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()));
            setFolders(allFolders);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load notes', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);
    
    const handleOpenLinkDialog = (note: FileItem) => {
        setFileToLink(note);
        setDriveLink(note.driveLink || '');
        setIsLinkDialogOpen(true);
    };

    const handleAddDriveLink = async () => {
        if (!fileToLink) return;
        try {
            const updateData = {
                driveLink: driveLink.trim() || undefined,
            };
            await updateFile(fileToLink.id, updateData);
            setNotes(prev => prev.map(n => n.id === fileToLink.id ? { ...n, ...updateData } : n));
            toast({ title: driveLink.trim() ? 'Note Linked' : 'Note Link Removed' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to link note', description: error.message });
        } finally {
            setIsLinkDialogOpen(false);
            setFileToLink(null);
            setDriveLink('');
        }
    };

    const handleConfirmDelete = async () => {
        if (!noteToDelete) return;
        try {
            await deleteFiles([noteToDelete.id]);
            setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
            toast({ title: 'Note Deleted' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
        } finally {
            setNoteToDelete(null);
        }
    };
    
    const handleNoteClick = (note: FileItem) => {
        if (note.driveLink) {
            window.open(note.driveLink, '_blank', 'noopener,noreferrer');
        } else {
            router.push(`/notes/editor?fileId=${note.id}`);
        }
    };
    
    const folderMap = new Map(folders.map(f => [f.id, f.name]));

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <>
            <div className="p-4 sm:p-6 flex flex-col items-center h-full">
                <header className="text-center mb-6">
                    <h1 className="text-3xl font-bold font-headline text-primary">Notes Manager</h1>
                    <p className="text-muted-foreground">
                        Your central place for creating and managing text notes.
                    </p>
                </header>

                <Card className="w-full max-w-4xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Your Notes</CardTitle>
                            <CardDescription>
                                You have {notes.length} note(s).
                            </CardDescription>
                        </div>
                        <Button asChild>
                            <Link href="/notes/create">
                                <Plus className="mr-2 h-4 w-4" />
                                Create New Note
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Folder</TableHead>
                                        <TableHead>Last Modified</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {notes.length > 0 ? notes.map(note => (
                                        <TableRow key={note.id}>
                                            <TableCell className="font-medium">
                                                <button onClick={() => handleNoteClick(note)} className="flex items-center gap-2 hover:underline text-left">
                                                    <FileText className="h-4 w-4 text-muted-foreground"/>
                                                    <span>{note.name}</span>
                                                    {note.driveLink && <LinkIcon className="h-3 w-3 text-blue-500" />}
                                                </button>
                                            </TableCell>
                                            <TableCell>{folderMap.get(note.folderId) || 'Unassigned'}</TableCell>
                                            <TableCell>{format(new Date(note.modifiedAt), 'PPp')}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => handleNoteClick(note)}><Edit className="mr-2 h-4 w-4"/> Edit / Open</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleOpenLinkDialog(note)}>
                                                          <LinkIcon className="mr-2 h-4 w-4" /> Link Google Drive File
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onSelect={() => setNoteToDelete(note)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow><TableCell colSpan={4} className="h-24 text-center">No notes found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
             <AlertDialog open={!!noteToDelete} onOpenChange={() => setNoteToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the note "{noteToDelete?.name}".</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Link to Google Drive File</DialogTitle>
                      <DialogDescription>
                          Paste the URL of a Google Drive file to create a shortcut to it. To remove a link, clear the URL and save.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                      <div className="space-y-2">
                          <Label>Note Name</Label>
                          <Input value={fileToLink?.name || ''} readOnly disabled />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="drive-link">Google Drive URL</Label>
                          <Input id="drive-link" value={driveLink} onChange={(e) => setDriveLink(e.target.value)} placeholder="https://docs.google.com/document/d/..." />
                      </div>
                  </div>
                  <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddDriveLink}>Save Link</Button>
                  </DialogFooter>
              </DialogContent>
            </Dialog>
        </>
    );
}
