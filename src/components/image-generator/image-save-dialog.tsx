
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, ChevronRight, LoaderCircle, FolderPlus } from "lucide-react";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getFolders, addFolder, addFileFromDataUrl, type FolderItem } from '@/services/file-service';
import { setFileForHint } from '@/services/image-placeholder-service';
import { SITE_IMAGES_FOLDER_ID } from '@/services/file-service';
import { cn } from '@/lib/utils';

interface ImageSaveDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  imageDataUrl: string;
  defaultFileName: string;
  convertFileToDataUrl?: () => Promise<string>;
  onSaveSuccess?: () => void;
  preselectedFolderId?: string;
  hint?: string;
}

export default function ImageSaveDialog({
  isOpen,
  onOpenChange,
  imageDataUrl,
  defaultFileName,
  convertFileToDataUrl,
  onSaveSuccess,
  preselectedFolderId,
  hint,
}: ImageSaveDialogProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [fileName, setFileName] = useState(defaultFileName);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  const loadFolders = useCallback(async () => {
    if (!user) return;
    setIsLoadingFolders(true);
    try {
      const fetchedFolders = await getFolders(user.uid);
      setFolders(fetchedFolders);
      
      if (preselectedFolderId && fetchedFolders.some(f => f.id === preselectedFolderId)) {
        setSelectedFolderId(preselectedFolderId);
      } else if (fetchedFolders.length > 0) {
        const rootFolder = fetchedFolders.find(f => !f.parentId);
        if (rootFolder) {
            setSelectedFolderId(rootFolder.id);
            setExpandedFolders(new Set([rootFolder.id]));
        } else {
            setSelectedFolderId(fetchedFolders[0].id);
        }
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to load folders', description: error.message });
    } finally {
      setIsLoadingFolders(false);
    }
  }, [user, toast, preselectedFolderId]);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
      setFileName(defaultFileName);
    }
  }, [isOpen, defaultFileName, loadFolders]);

  const handleSave = async () => {
    if (!user || !selectedFolderId || !fileName.trim()) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a folder and provide a file name.' });
      return;
    }
    setIsSaving(true);

    try {
        const finalImageDataUrl = convertFileToDataUrl ? await convertFileToDataUrl() : imageDataUrl;

        const newFile = await addFileFromDataUrl({
            dataUrl: finalImageDataUrl,
            fileName: fileName.trim(),
            userId: user.uid,
            folderId: selectedFolderId,
        });
        
        if (hint) {
          await setFileForHint(hint, newFile.id);
        }

        toast({ title: 'Image Saved', description: `"${fileName.trim()}" has been saved.` });
        onSaveSuccess?.();
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
        await addFolder({
            name: newFolderName.trim(),
            parentId: newFolderParentId,
            userId: user.uid,
        });
        setNewFolderName("");
        setNewFolderParentId(null);
        toast({ title: "Folder Created" });
        await loadFolders(); // Refresh folder list
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to create folder", description: error.message });
    } finally {
        setIsCreatingFolder(false);
    }
  };

  const FolderTreeItem = ({ folder, allFolders, level = 0 }: { folder: FolderItem, allFolders: FolderItem[], level?: number }) => {
    const hasChildren = allFolders.some(f => f.parentId === folder.id);
    const isExpanded = expandedFolders.has(folder.id);

    return (
        <div style={{ marginLeft: level > 0 ? '1rem' : '0' }}>
            <div
                className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer",
                    selectedFolderId === folder.id ? "bg-primary/20" : "hover:bg-accent"
                )}
                onClick={() => setSelectedFolderId(folder.id)}
            >
                {hasChildren ? (
                    <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-90')} onClick={(e) => { e.stopPropagation(); setExpandedFolders(p => { const n = new Set(p); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; }); }} />
                ) : <div className="w-4" />}
                <Folder className="h-4 w-4 text-primary" />
                <span className="text-sm truncate">{folder.name}</span>
            </div>
            {isExpanded && allFolders.filter(f => f.parentId === folder.id).sort((a,b) => a.name.localeCompare(b.name)).map(child => (
                <FolderTreeItem key={child.id} folder={child} allFolders={allFolders} level={level + 1} />
            ))}
        </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Image to Document Manager</DialogTitle>
          <DialogDescription>
            Choose a folder and a name for your new image.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Select Folder</Label>
            <ScrollArea className="h-48 w-full rounded-md border">
              <div className="p-2">
                {isLoadingFolders ? (
                    <div className="flex items-center justify-center h-full"><LoaderCircle className="h-6 w-6 animate-spin" /></div>
                ) : (
                    folders.filter(f => !f.parentId).map(folder => (
                        <FolderTreeItem key={folder.id} folder={folder} allFolders={folders} />
                    ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
              <Label htmlFor="new-folder-name">Create New Folder In "{folders.find(f => f.id === (newFolderParentId || selectedFolderId))?.name || 'Root'}"</Label>
              <div className="flex gap-2">
                  <Input
                    id="new-folder-name"
                    placeholder="New folder name..."
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    disabled={isCreatingFolder}
                  />
                  <Button onClick={() => { setNewFolderParentId(selectedFolderId); handleCreateFolder(); }} disabled={isCreatingFolder || !newFolderName.trim()}>
                      {isCreatingFolder ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                  </Button>
              </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-name">File Name</Label>
            <Input
              id="file-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || isLoadingFolders || !selectedFolderId}>
            {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Save Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
