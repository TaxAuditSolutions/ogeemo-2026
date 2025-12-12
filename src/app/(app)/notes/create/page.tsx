'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { LoaderCircle, Save, ArrowLeft, FolderPlus, Check, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addFileRecord } from '@/services/file-service';
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

export default function CreateNotePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [title, setTitle] = useState('');
    const [driveLink, setDriveLink] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isFolderPopoverOpen, setIsFolderPopoverOpen] = useState(false);

    const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const loadData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const fetchedFolders = await getFolders(user.uid);
            setFolders(fetchedFolders);

            if (fetchedFolders.length > 0) {
                const defaultFolder = fetchedFolders.find(f => f.name === 'Notes') || fetchedFolders[0];
                setSelectedFolderId(defaultFolder.id);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load folders', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

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
         if (!selectedFolderId) {
            toast({ variant: 'destructive', title: 'Folder is required' });
            return;
        }

        setIsSaving(true);
        try {
            const newFileRecord = {
                name: title.trim(),
                folderId: selectedFolderId,
                userId: user.uid,
                type: driveLink.trim() ? 'google-drive-link' : 'text/plain',
                size: 0,
                modifiedAt: new Date(),
                storagePath: '',
                content: driveLink.trim() ? '' : undefined, // No content for links, start with empty for text
                driveLink: driveLink.trim() || undefined,
            };

            await addFileRecord(newFileRecord);
            toast({ title: "Note Created", description: `"${title.trim()}" has been added.` });
            router.push(`/notes`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
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
        <div className="p-4 sm:p-6 h-full flex flex-col items-center justify-center">
            <Card className="w-full max-w-xl">
                <CardHeader>
                    <CardTitle>Create New Note</CardTitle>
                    <CardDescription>
                        Give your note a name and choose where to save it. You can optionally add a link to a Google Drive file.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="note-title">Note Name</Label>
                        <Input 
                            id="note-title"
                            placeholder="My new note or document title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="drive-link">Google Drive Link (Optional)</Label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="drive-link"
                                placeholder="https://docs.google.com/..."
                                value={driveLink}
                                onChange={(e) => setDriveLink(e.target.value)}
                                className="pl-10"
                            />
                        </div>
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
                </CardContent>
                <CardFooter className="flex justify-between">
                     <Button asChild variant="outline">
                        <Link href="/notes">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notes
                        </Link>
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Create Note
                    </Button>
                </CardFooter>
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
