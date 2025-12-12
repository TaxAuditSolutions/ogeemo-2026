'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle, Save, ArrowLeft, FolderPlus, Check } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getFileById, updateFile, addTextFileClient, type FileItem } from '@/services/file-service';
import { getFolders, addFolder, type FolderItem } from '@/services/file-manager-folders';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


export default function NoteEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { toast } = useToast();

    const [file, setFile] = useState<FileItem | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [selectedFolderId, setSelectedFolderId] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFolderPopoverOpen, setIsFolderPopoverOpen] = useState(false);

    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const fileId = searchParams.get('fileId');

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const fetchedFolders = await getFolders(user.uid);
            setFolders(fetchedFolders);

            if (fileId) {
                const fetchedFile = await getFileById(fileId);
                if (fetchedFile) {
                    setFile(fetchedFile);
                    setTitle(fetchedFile.name);
                    setContent(fetchedFile.content || '');
                    setSelectedFolderId(fetchedFile.folderId);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'File not found.' });
                    router.push('/document-manager');
                }
            } else {
                if (fetchedFolders.length > 0) {
                    const defaultFolder = fetchedFolders.find(f => f.name === 'Notes') || fetchedFolders[0];
                    setSelectedFolderId(defaultFolder.id);
                }
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [fileId, user, router, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleCreateFolder = async () => {
        if (!user || !newFolderName.trim()) return;
        try {
            const newFolder = await addFolder({ name: newFolderName.trim(), userId: user.uid, parentId: null });
            setFolders(prev => [...prev, newFolder].sort((a,b) => a.name.localeCompare(b.name)));
            setSelectedFolderId(newFolder.id);
            toast({ title: 'Folder Created' });
            setIsNewFolderDialogOpen(false);
            setNewFolderName('');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to create folder', description: e.message });
        }
    };

    const handleSave = async () => {
        if (!user) return;
        if (!title.trim()) {
            toast({ variant: 'destructive', title: 'Title is required' });
            return;
        }

        setIsSaving(true);
        try {
            if (fileId && file) {
                await updateFile(file.id, { name: title, content: content, folderId: selectedFolderId });
                toast({ title: 'Note Saved', description: `"${title}" has been updated.` });
            } else {
                 if (!selectedFolderId) {
                    toast({ variant: 'destructive', title: 'Folder is required' });
                    setIsSaving(false);
                    return;
                }
                const newFile = await addTextFileClient(user.uid, selectedFolderId, title, content);
                toast({ title: 'Note Created', description: `"${title}" has been saved.` });
                router.replace(`/notes/editor?fileId=${newFile.id}`);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    const selectedFolder = folders.find(f => f.id === selectedFolderId);

    return (
        <>
        <div className="p-4 sm:p-6 h-full flex flex-col items-center">
             <header className="text-center mb-6 w-full max-w-4xl">
                <div className="flex justify-between items-center">
                    <Button variant="outline" onClick={() => router.push('/notes')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
                    </Button>
                    <div className="text-center flex-1">
                        <h1 className="text-2xl font-bold font-headline text-primary">
                            {fileId ? "Edit Note" : "Create New Note"}
                        </h1>
                    </div>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                </div>
            </header>
            <Card className="w-full max-w-4xl flex-1 flex flex-col">
                <CardHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="note-title">Title</Label>
                            <Input 
                                id="note-title"
                                placeholder="My new note"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="folder-select">Folder</Label>
                            <div className="flex gap-2">
                                <Popover open={isFolderPopoverOpen} onOpenChange={setIsFolderPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            {selectedFolder?.name || "Select a folder..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search folders..." />
                                            <CommandList>
                                                <CommandEmpty>No folder found.</CommandEmpty>
                                                <CommandGroup>
                                                    {folders.map(folder => (
                                                        <CommandItem key={folder.id} value={folder.name} onSelect={() => { setSelectedFolderId(folder.id); setIsFolderPopoverOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", selectedFolderId === folder.id ? "opacity-100" : "opacity-0")} />
                                                            {folder.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Button type="button" variant="outline" size="icon" onClick={() => setIsNewFolderDialogOpen(true)}>
                                    <FolderPlus className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                     <Label htmlFor="note-content" className="mb-2">Content</Label>
                    <Textarea
                        id="note-content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="h-full w-full resize-none flex-1"
                        placeholder="Start writing your note here..."
                    />
                </CardContent>
            </Card>
        </div>
        <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="folder-name-new">Name</Label>
                    <Input id="folder-name-new" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }} />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateFolder}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
