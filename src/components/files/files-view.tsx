
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDrag, useDrop } from 'react-dnd';
import {
  Folder,
  File as FileIconLucide,
  LoaderCircle,
  FolderPlus,
  ChevronRight,
  ExternalLink,
  MoreVertical,
  Pencil,
  Trash2,
  BookOpen,
  Link as LinkIcon,
  Info,
  Files,
  FilePlus,
  FileText,
  Sheet,
  Presentation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type FileItem, type FolderItem } from '@/data/files';
import { useToast } from '@/hooks/use-toast';
// Import from the NEW isolated folder service
import { getFolders, addFolder, updateFolder, deleteFolders } from '@/services/file-manager-folders';
// Continue to use file-service for FILE operations
import { getFiles, deleteFiles, updateFile, addTextFileClient, addFileRecord } from '@/services/file-service';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '../ui/label';
import { Input } from '../ui/input';
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
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import Link from 'next/link';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const ItemTypes = {
  FILE: 'file',
  FOLDER: 'folder',
};

type DroppableItem = (FileItem & { type?: 'file' }) | (FolderItem & { type: 'folder' });

const googleDriveFileTypes = [
    { value: 'doc', label: 'Google Doc', icon: FileText, href: 'https://docs.google.com/document/create' },
    { value: 'sheet', label: 'Google Sheet', icon: Sheet, href: 'https://docs.google.com/spreadsheets/create' },
    { value: 'slide', label: 'Google Slide', icon: Presentation, href: 'https://docs.google.com/presentation/create' },
];

const newFileSchema = z.object({
    fileName: z.string().min(1, 'File name is required.'),
    fileType: z.enum(['file', 'link', 'gdrive']),
    fileUrl: z.string().optional(),
    gdriveFileType: z.string().optional(),
    targetFolderId: z.string().min(1, 'Please select a folder.'),
}).refine(data => {
    if (data.fileType === 'link') {
        return !!data.fileUrl && z.string().url().safeParse(data.fileUrl).success;
    }
    return true;
}, {
    message: 'A valid URL is required for link type.',
    path: ['fileUrl'],
});

type NewFileFormData = z.infer<typeof newFileSchema>;

export function FilesView() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderDriveLink, setNewFolderDriveLink] = useState('');

  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);


  const [isSaving, setIsSaving] = useState(false);
  
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<FolderItem | null>(null);
  const [renameInputValue, setRenameInputValue] = useState("");

  const [renamingFile, setRenamingFile] = useState<FileItem | null>(null);
  const [renameFileValue, setRenameFileValue] = useState("");
  
  const [isDriveLinkDialogOpen, setIsDriveLinkDialogOpen] = useState(false);
  const [folderToLink, setFolderToLink] = useState<FolderItem | null>(null);
  const [driveFolderLink, setDriveFolderLink] = useState('');

  const [isDriveFileLinkDialogOpen, setIsDriveFileLinkDialogOpen] = useState(false);
  const [driveFileLink, setDriveFileLink] = useState('');
  const [fileToLink, setFileToLink] = useState<FileItem | null>(null);
  
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [scrollToFileId, setScrollToFileId] = useState<string | null>(null);
  const fileRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<NewFileFormData>({
    resolver: zodResolver(newFileSchema),
    defaultValues: {
      fileName: '',
      fileType: 'file',
      fileUrl: '',
      gdriveFileType: 'doc',
      targetFolderId: 'all',
    },
  });

  const fileTypeWatcher = form.watch('fileType');


  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedFolders, fetchedFiles] = await Promise.all([
        getFolders(user.uid),
        getFiles(user.uid),
      ]);
      setFolders(fetchedFolders);
      setFiles(fetchedFiles);
      if (fetchedFolders.length > 0) {
        const rootFolder = fetchedFolders.find(f => !f.parentId);
        if (rootFolder) {
            setExpandedFolders(new Set([rootFolder.id]));
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load data',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleSelectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedFileIds([]);
  };

  const handleSelectFile = (file: FileItem) => {
    if (file.type === 'text/plain' || file.type === 'application/vnd.ogeemo-flowchart+json') {
        router.push(`/notes/editor?fileId=${file.id}`);
    } else if (file.driveLink) {
        window.open(file.driveLink, '_blank', 'noopener,noreferrer');
    } else {
        toast({ title: "Preview not available", description: "This file type cannot be previewed directly." });
    }
  };
  
  const filesInSelectedFolder = React.useMemo(() => {
    if (selectedFolderId === 'all') return files;
    return files.filter((file) => file.folderId === selectedFolderId);
  }, [files, selectedFolderId]);

  const handleOpenNewFolderDialog = (parentId: string | null) => {
    setNewFolderParentId(parentId);
    setNewFolderName('');
    setNewFolderDriveLink('');
    setIsNewFolderDialogOpen(true);
  };

  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
        const folderData: Omit<FolderItem, 'id' | 'createdAt'> = {
            name: newFolderName.trim(),
            userId: user.uid,
            parentId: newFolderParentId,
            ...(newFolderDriveLink.trim() && { driveLink: newFolderDriveLink.trim() }),
        };
        const newFolder = await addFolder(folderData);
        const updatedFolders = [...folders, newFolder];
        setFolders(updatedFolders);
        
        // If creating from the New File dialog, update the form's selected folder
        if (isNewFileDialogOpen) {
            form.setValue('targetFolderId', newFolder.id);
        }

        if (newFolder.parentId) {
            setExpandedFolders(prev => new Set(prev).add(newFolder.parentId!));
        }
        setIsNewFolderDialogOpen(false);
        setNewFolderName('');
        setNewFolderDriveLink('');
        toast({ title: 'Folder Created' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to create folder', description: error.message });
    } finally {
        setIsCreatingFolder(false);
    }
  };
  
  const handleOpenNewFileDialog = () => {
    form.reset({
        fileName: '',
        fileType: 'file',
        fileUrl: '',
        gdriveFileType: 'doc',
        targetFolderId: selectedFolderId === 'all' ? '' : selectedFolderId,
    });
    setIsNewFileDialogOpen(true);
  };

  async function handleCreateNewFile (values: NewFileFormData) {
    if (!user) {
      toast({ variant: 'destructive', title: 'You must be logged in.' });
      return;
    }
    if (values.targetFolderId === 'all' || !values.targetFolderId) {
      toast({ variant: 'destructive', title: 'Please select a folder first.' });
      return;
    }

    setIsSaving(true);
    try {
      let newFile: FileItem;
      if (values.fileType === 'link') {
        const newFileRecord: Omit<FileItem, 'id'> = {
          name: values.fileName.trim(),
          type: 'url-link',
          size: 0,
          modifiedAt: new Date(),
          folderId: values.targetFolderId,
          userId: user.uid,
          storagePath: '',
          driveLink: values.fileUrl?.trim(),
        };
        newFile = await addFileRecord(newFileRecord);
      } else if (values.fileType === 'gdrive') {
        const driveApp = googleDriveFileTypes.find(app => app.value === values.gdriveFileType);
        if (!driveApp) throw new Error("Invalid Google Drive file type selected.");

        const newFileRecord: Omit<FileItem, 'id'> = {
          name: values.fileName.trim(),
          type: driveApp.value, // Special type for these links
          size: 0,
          modifiedAt: new Date(),
          folderId: values.targetFolderId,
          userId: user.uid,
          storagePath: '',
          driveLink: driveApp.href,
        };
        newFile = await addFileRecord(newFileRecord);
      } else {
        newFile = await addTextFileClient(user.uid, values.targetFolderId, values.fileName.trim());
      }
      
      setFiles(prev => [...prev, newFile]);
      setScrollToFileId(newFile.id);
      toast({ title: 'File Created', description: `File "${newFile.name}" has been created.` });
      setIsNewFileDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Create Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (scrollToFileId) {
      const fileElement = fileRefs.current.get(scrollToFileId);
      fileElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelectedFileIds([scrollToFileId]);
      setScrollToFileId(null);
    }
  }, [scrollToFileId, files]);

  const handleStartRename = (item: FolderItem) => {
    setRenamingFolder(item);
    setRenameInputValue(item.name);
  };

  const handleCancelRename = () => {
    setRenamingFolder(null);
    setRenameInputValue("");
  };

  const handleConfirmRename = async () => {
    if (!renamingFolder || !renameInputValue.trim() || renamingFolder.name === renameInputValue.trim()) {
      handleCancelRename();
      return;
    }

    try {
      await updateFolder(renamingFolder.id, { name: renameInputValue.trim() });
      setFolders(prev => prev.map(f => f.id === renamingFolder.id ? { ...f, name: renameInputValue.trim() } : f));
      toast({ title: "Folder Renamed" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Rename Failed", description: error.message });
    } finally {
      handleCancelRename();
    }
  };
  
  const handleStartFileRename = (file: FileItem) => {
    setRenamingFile(file);
    setRenameFileValue(file.name);
  };

  const handleCancelFileRename = () => {
    setRenamingFile(null);
    setRenameFileValue("");
  };
  
  const handleConfirmFileRename = async () => {
    if (!renamingFile || !renameFileValue.trim() || renamingFile.name === renameFileValue.trim()) {
        handleCancelFileRename();
        return;
    }
    try {
        await updateFile(renamingFile.id, { name: renameFileValue.trim() });
        setFiles(prev => prev.map(f => f.id === renamingFile.id ? { ...f, name: renameFileValue.trim() } : f));
        toast({ title: "File Renamed" });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Rename Failed", description: error.message });
    } finally {
        handleCancelFileRename();
    }
  };


  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
        await deleteFiles([fileToDelete.id]);
        setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
        toast({ title: 'File Deleted' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to delete file', description: error.message });
    } finally {
        setFileToDelete(null);
    }
  };
  
  const handleOpenDriveLinkDialog = (file: FileItem) => {
    setFileToLink(file);
    setDriveFileLink(file.driveLink || '');
    setIsDriveFileLinkDialogOpen(true);
  };
  
  const handleOpenDriveFolderLinkDialog = (folder: FolderItem) => {
    setFolderToLink(folder);
    setDriveFolderLink(folder.driveLink || '');
    setIsDriveLinkDialogOpen(true);
  };

  const handleAddDriveLink = async () => {
    if (!fileToLink) return;
    try {
        const updateData = {
            driveLink: driveFileLink.trim() || undefined,
            type: driveFileLink.trim() ? 'google-drive-link' : fileToLink.type === 'google-drive-link' ? 'text/plain' : fileToLink.type,
        };
        await updateFile(fileToLink.id, updateData);
        setFiles(prev => prev.map(f => f.id === fileToLink.id ? { ...f, ...updateData } : f));
        toast({ title: driveFileLink.trim() ? 'Google Drive File Linked' : 'File Link Removed' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to link file', description: error.message });
    } finally {
        setIsDriveFileLinkDialogOpen(false);
        setFileToLink(null);
        setDriveFileLink('');
    }
  };

  const handleAddFolderDriveLink = async () => {
    if (!folderToLink) return;
    try {
        await updateFolder(folderToLink.id, {
            driveLink: driveFolderLink.trim() || undefined,
        });
        setFolders(prev => prev.map(f => f.id === folderToLink.id ? { ...f, driveLink: driveFolderLink.trim() || undefined } : f));
        toast({ title: driveFolderLink.trim() ? 'Google Drive Folder Linked' : 'Folder Link Removed'});
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to link folder', description: error.message });
    } finally {
        setIsDriveLinkDialogOpen(false);
        setFolderToLink(null);
        setDriveFolderLink('');
    }
  };
  
  const handleDeleteFolder = (folder: FolderItem) => {
        setFolderToDelete(folder);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!user || !folderToDelete) return;

    const allFoldersIncludingChildren = (function getDescendants(parentId: string, all: FolderItem[]): string[] {
        const children = all.filter(f => f.parentId === parentId).map(f => f.id);
        return [parentId, ...children.flatMap(childId => getDescendants(childId, all))];
    })(folderToDelete.id, folders);

    try {
        // Delete all files in the folder and its children first
        const filesToDelete = files.filter(f => allFoldersIncludingChildren.includes(f.folderId));
        if (filesToDelete.length > 0) {
            await deleteFiles(filesToDelete.map(f => f.id));
        }

        // Then delete the folders
        await deleteFolders(allFoldersIncludingChildren);

        setFolders(prev => prev.filter(f => !allFoldersIncludingChildren.includes(f.id)));
        setFiles(prev => prev.filter(f => !allFoldersIncludingChildren.includes(f.folderId)));
        
        if (allFoldersIncludingChildren.includes(selectedFolderId)) {
            setSelectedFolderId('all');
        }
        
        toast({ title: "Folder and its contents deleted" });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    } finally {
        setFolderToDelete(null);
    }
  };


  const handleToggleSelect = (fileId: string) => {
    setSelectedFileIds(prev => prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]);
  };
  
  const handleToggleSelectAll = (checked: boolean | 'indeterminate') => {
    setSelectedFileIds(checked ? filesInSelectedFolder.map(f => f.id) : []);
  };
  
  const handleConfirmBulkDelete = async () => {
    if (selectedFileIds.length === 0) return;
    try {
        await deleteFiles(selectedFileIds);
        setFiles(prev => prev.filter(f => !selectedFileIds.includes(f.id)));
        toast({ title: `${selectedFileIds.length} file(s) deleted.`});
        setSelectedFileIds([]);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Bulk Delete Failed", description: error.message });
    } finally {
        setIsBulkDeleteAlertOpen(false);
    }
  };

  const handleFileDrop = async (file: FileItem, newFolderId: string) => {
    if (file.folderId === newFolderId) return;

    const originalFiles = [...files];
    setFiles(prev => prev.map(f => f.id === file.id ? { ...f, folderId: newFolderId } : f));

    try {
        await updateFile(file.id, { folderId: newFolderId });
        const folder = folders.find(f => f.id === newFolderId);
        toast({ title: "File Moved", description: `"${file.name}" moved to "${folder?.name}".` });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Move Failed", description: error.message });
        setFiles(originalFiles);
    }
  };

  const allVisibleSelected = filesInSelectedFolder.length > 0 && selectedFileIds.length === filesInSelectedFolder.length;
  const someVisibleSelected = selectedFileIds.length > 0 && !allVisibleSelected;


  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const FolderTreeItem = ({ folder, allFolders, level = 0 }: { folder: FolderItem, allFolders: FolderItem[], level?: number }) => {
    const hasChildren = allFolders.some(f => f.parentId === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isRenaming = renamingFolder?.id === folder.id;

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: ItemTypes.FILE,
        drop: (item: FileItem) => handleFileDrop(item, folder.id),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));

    return (
        <div style={{ marginLeft: level > 0 ? '1rem' : '0' }} className="my-0.5">
            <div
                ref={drop}
                className={cn(
                    "flex items-center justify-between border border-black rounded-md h-8 group",
                    isRenaming ? 'bg-background' : 'hover:bg-accent',
                    selectedFolderId === folder.id && "bg-primary/20",
                    isOver && canDrop && "bg-primary/30 ring-2 ring-primary"
                )}
            >
                 <div className="flex items-center flex-1 min-w-0 h-full pl-1 cursor-pointer" onClick={() => !isRenaming && handleSelectFolder(folder.id)}>
                    {hasChildren ? (
                        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-90')} onClick={(e) => { e.stopPropagation(); setExpandedFolders(p => { const n = new Set(p); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; }); }} />
                    ) : <div className="w-4" />}
                    <Folder className="h-4 w-4 text-foreground ml-1" />
                     {isRenaming ? (
                        <Input
                            autoFocus
                            value={renameInputValue}
                            onChange={e => setRenameInputValue(e.target.value)}
                            onBlur={handleConfirmRename}
                            onKeyDown={e => { if (e.key === 'Enter') handleConfirmRename(); if (e.key === 'Escape') handleCancelRename(); }}
                            className="h-full py-0 px-2 text-xs font-medium bg-transparent"
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <span className="text-sm font-medium truncate ml-2 flex-1 flex items-center gap-1">
                            {folder.name}
                        </span>
                    )}
                </div>
                <div className="flex items-center">
                    {folder.driveLink && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); window.open(folder.driveLink!, '_blank', 'noopener,noreferrer'); }}>
                        <ExternalLink className="h-4 w-4 text-blue-500" />
                      </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onSelect={() => handleOpenNewFolderDialog(folder.id)}><FolderPlus className="mr-2 h-4 w-4" />Create subfolder</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleStartRename(folder)}><Pencil className="mr-2 h-4 w-4" />Rename</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleOpenDriveFolderLinkDialog(folder)}><LinkIcon className="mr-2 h-4 w-4" />Link Google Drive Folder</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {isExpanded && allFolders.filter(f => f.parentId === folder.id).sort((a,b) => a.name.localeCompare(b.name)).map(child => (
                <FolderTreeItem key={child.id} folder={child} allFolders={allFolders} level={level + 1} />
            ))}
        </div>
    );
  };
  
  const DraggableFileRow = ({ file, children }: { file: FileItem, children: React.ReactNode }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.FILE,
        item: file,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div ref={drag} className={cn(isDragging && 'opacity-50')}>
            {children}
        </div>
    );
  };


  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const flattenedFolders = (folders: FolderItem[], parentId: string | null = null, level = 0): { folder: FolderItem, level: number }[] => {
      return folders
          .filter(f => f.parentId === parentId)
          .sort((a, b) => a.name.localeCompare(b.name))
          .flatMap(f => [{ folder: f, level }, ...flattenedFolders(folders, f.id, level + 1)]);
  };

  return (
    <>
    <div className="p-4 sm:p-6 space-y-4">
        <header className="text-center">
            <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-bold font-headline text-primary">Document Manager</h1>
                 <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
                   <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <DialogTrigger asChild>
                               <Button variant="ghost" size="icon">
                                   <Info className="h-5 w-5 text-muted-foreground" />
                               </Button>
                           </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>View Instructions</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">About the Document Manager</DialogTitle>
                            <DialogDescription>A guide to creating and managing your files and folders.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
                             <Accordion type="single" collapsible defaultValue="item-1">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>Unified File System</AccordionTrigger>
                                    <AccordionContent>
                                    The Document Manager provides a single, unified interface to manage both local files stored securely within Ogeemo and shortcuts to your files and folders in Google Drive, keeping all your resources organized in one place.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger>Creating Folders and Files</AccordionTrigger>
                                    <AccordionContent>
                                        <ul className="list-disc space-y-2 pl-5">
                                            <li><strong>New Folder:</strong> Click the "+ New Folder" button to create a new folder. You can create them at the root level or nested inside other folders.</li>
                                            <li><strong>New File:</strong> Click "+ New File" to create different types of items. You can create a blank text file, a link to a website, or a shortcut to create a new Google Doc, Sheet, or Slide.</li>
                                        </ul>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="item-3">
                                    <AccordionTrigger>Google Drive Integration</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-2">
                                            <p>You can link both folders and individual files directly to their counterparts in Google Drive. This creates a powerful, centralized view of all your project assets.</p>
                                            <h4 className="font-semibold">How to Link:</h4>
                                            <ul className="list-decimal space-y-2 pl-5">
                                                <li>Use the "New File" button and select "Google Drive File" to create a shortcut that opens a new Google Doc, Sheet, or Slide in a new tab.</li>
                                                <li>Once you've created your document in Google Drive, copy its URL from your browser's address bar.</li>
                                                <li>Return to Ogeemo, click the 3-dot menu on the new file entry, and select "Link Google Drive File".</li>
                                                <li>Paste the URL into the dialog and save. An icon will appear, giving you one-click access to that specific file.</li>
                                            </ul>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                 <AccordionItem value="item-4" className="border-b-0">
                                    <AccordionTrigger>Organization</AccordionTrigger>
                                    <AccordionContent>
                                        <p>Simply drag and drop files into folders to organize them. You can also drag and drop folders to nest them within each other, creating the structure that works best for you.</p>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button>Close</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">An integration hub to manage Google Drive Files &amp; Folders</p>
        </header>

        <Card>
            <CardHeader className="p-2">
                <div className="grid grid-cols-2 gap-2">
                    <Button className="flex-1" onClick={() => handleOpenNewFolderDialog(null)}>
                        <FolderPlus className="mr-2 h-4 w-4"/> New Folder
                    </Button>
                    <Button className="flex-1" onClick={handleOpenNewFileDialog}>
                        <FilePlus className="mr-2 h-4 w-4"/> New File
                    </Button>
                </div>
            </CardHeader>
        </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="md:col-span-1 flex flex-col gap-2">
            <div className="h-8 flex items-center p-1 border border-black bg-primary/10 rounded-md text-primary">
                <p className="flex-1 text-center font-semibold text-sm">Folders</p>
            </div>
            <div className="flex flex-col border border-black rounded-lg h-[calc(100vh-350px)]">
              <div
                className={cn("p-2 border-b cursor-pointer", selectedFolderId === 'all' && 'bg-primary/20')}
                onClick={() => handleSelectFolder('all')}
              >
                  <Button variant="ghost" className="w-full justify-start gap-2 h-7"><Files className="h-4 w-4" />All Files</Button>
              </div>
              <ScrollArea className="flex-1 rounded-md p-2">
                  {folders.filter(f => !f.parentId).map(folder => (
                    <FolderTreeItem key={folder.id} folder={folder} allFolders={folders} />
                  ))}
              </ScrollArea>
            </div>
        </div>

        <div className="md:col-span-2 flex flex-col gap-2">
            <div className="h-8 flex items-center p-1 border border-black bg-primary/10 rounded-md text-primary">
                {selectedFileIds.length > 0 ? (
                     <div className="flex justify-between items-center w-full px-2">
                        <p className="font-semibold text-sm">{selectedFileIds.length} file(s) selected</p>
                        <Button variant="destructive" size="sm" className="h-6" onClick={() => setIsBulkDeleteAlertOpen(true)}>
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete Selected
                        </Button>
                     </div>
                ) : (
                    <p className="flex-1 text-center font-semibold text-sm">Files in "{selectedFolderId === 'all' ? 'All Folders' : folders.find(f=>f.id===selectedFolderId)?.name}"</p>
                )}
            </div>
            <div className="flex flex-col border border-black rounded-lg h-[calc(100vh-350px)]">
                <div className="p-2 border-b h-8 flex items-center">
                    <Checkbox
                        checked={allVisibleSelected ? true : (someVisibleSelected ? 'indeterminate' : false)}
                        onCheckedChange={() => handleToggleSelectAll(!allVisibleSelected)}
                        className="ml-2 mr-4"
                        aria-label="Select all files"
                    />
                    <p className="text-xs font-medium text-muted-foreground">Name</p>
                </div>
                <ScrollArea className="flex-1">
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center p-4">
                        <LoaderCircle className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      filesInSelectedFolder.length > 0 ? (
                        filesInSelectedFolder.map((file) => {
                          const isRenaming = renamingFile?.id === file.id;
                          return (
                           <DraggableFileRow key={file.id} file={file}>
                            <div className="flex items-center border-b h-8 group" ref={(el) => fileRefs.current.set(file.id, el)}>
                                <Checkbox
                                    checked={selectedFileIds.includes(file.id)}
                                    onCheckedChange={() => handleToggleSelect(file.id)}
                                    className="ml-2 mr-4"
                                    aria-label={`Select file ${file.name}`}
                                />
                              <div className="flex items-center flex-1 min-w-0 h-full" onClick={() => !isRenaming && handleSelectFile(file)}>
                                <FileIconLucide className="h-4 w-4 text-primary ml-1" />
                                {isRenaming ? (
                                    <Input
                                        autoFocus
                                        value={renameFileValue}
                                        onChange={e => setRenameFileValue(e.target.value)}
                                        onBlur={handleConfirmFileRename}
                                        onKeyDown={e => { if (e.key === 'Enter') handleConfirmFileRename(); if (e.key === 'Escape') handleCancelFileRename(); }}
                                        className="h-full py-0 px-2 text-xs font-medium bg-transparent"
                                        onClick={e => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="text-xs font-medium truncate ml-2 flex-1 flex items-center gap-1 cursor-pointer">
                                        {file.name}
                                        {file.driveLink && <LinkIcon className="h-3 w-3 text-blue-500" />}
                                    </span>
                                )}
                              </div>
                              <div className="pr-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => handleSelectFile(file)}>
                                      <BookOpen className="mr-2 h-4 w-4" /> Open / Preview
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onSelect={() => handleStartFileRename(file)}>
                                      <Pencil className="mr-2 h-4 w-4" /> Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleOpenDriveLinkDialog(file)}>
                                      <LinkIcon className="mr-2 h-4 w-4" /> Link Google Drive File
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setFileToDelete(file); }} className="text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                           </DraggableFileRow>
                          )
                        })
                      ) : (
                        <div className="text-center text-sm text-muted-foreground p-4">This folder is empty.</div>
                      )
                    )}
                  </CardContent>
                </ScrollArea>
              </div>
        </div>
      </div>
    </div>
    
    <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="folder-name-new">Name</Label>
                    <Input id="folder-name-new" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter') { await handleCreateFolder(); } }} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="folder-drive-link">Google Drive Link (Optional)</Label>
                    <Input id="folder-drive-link" value={newFolderDriveLink} onChange={(e) => setNewFolderDriveLink(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
                </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder} disabled={isCreatingFolder}>
                {isCreatingFolder && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
      <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateNewFile)}>
              <div className="flex items-center justify-center p-6">
                <div className="w-full max-w-sm space-y-6">
                  <FormField
                    control={form.control}
                    name="fileType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>What would you like to create?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-3"
                          >
                            <div className="flex items-start space-x-3">
                              <FormControl><RadioGroupItem value="file" id="type-file" className="mt-1" /></FormControl>
                              <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="type-file">Empty Folder</Label>
                                <FormDescription>Creates an empty folder, ready for future files.</FormDescription>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3">
                              <FormControl><RadioGroupItem value="link" id="type-link" className="mt-1" /></FormControl>
                              <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="type-link">Link (URL)</Label>
                                <FormDescription>Creates a shortcut to an external website or web page.</FormDescription>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3">
                              <FormControl><RadioGroupItem value="gdrive" id="type-gdrive" className="mt-1"/></FormControl>
                              <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="type-gdrive">Google Drive File</Label>
                                <FormDescription>Creates a shortcut that opens a new document in your Google Drive.</FormDescription>
                              </div>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="fileName" render={({ field }) => ( <FormItem> <FormLabel>Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  {fileTypeWatcher === 'link' && ( <FormField control={form.control} name="fileUrl" render={({ field }) => ( <FormItem> <FormLabel>URL</FormLabel> <FormControl><Input type="url" placeholder="https://example.com" {...field} /></FormControl> <FormMessage /> </FormItem> )} /> )}
                  {fileTypeWatcher === 'gdrive' && ( <FormField control={form.control} name="gdriveFileType" render={({ field }) => ( <FormItem> <FormLabel>Google Drive File Type</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{googleDriveFileTypes.map(app => ( <SelectItem key={app.value} value={app.value}><div className="flex items-center gap-2"><app.icon className="h-4 w-4" /> {app.label}</div></SelectItem>))}</SelectContent></Select><FormMessage /> </FormItem> )} /> )}
                  <FormField control={form.control} name="targetFolderId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Folder</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a folder..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="all" disabled>Select a folder</SelectItem>
                            {flattenedFolders(folders).map(({ folder, level }) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                <span style={{ paddingLeft: `${level * 1.5}rem` }}>{folder.name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" onClick={() => handleOpenNewFolderDialog(form.getValues('targetFolderId'))}>
                          <FolderPlus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsNewFileDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>{isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />} Create</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the folder "{folderToDelete?.name}" and all its contents. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteFolder} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the file "{fileToDelete?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteFile} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <Dialog open={isDriveFileLinkDialogOpen} onOpenChange={setIsDriveFileLinkDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Link to a Google Drive File</DialogTitle>
                <DialogDescription>
                    Paste the shareable URL of a Google Drive file to create a shortcut to it. To remove a link, clear the URL and save.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>Ogeemo File</Label>
                    <Input value={fileToLink?.name || ''} readOnly disabled />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="drive-link">Google Drive URL</Label>
                    <Input id="drive-link" value={driveFileLink} onChange={(e) => setDriveFileLink(e.target.value)} placeholder="https://docs.google.com/document/d/..." />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDriveFileLinkDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddDriveLink}>Save Link</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
     <Dialog open={isDriveLinkDialogOpen} onOpenChange={setIsDriveLinkDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Link to a Google Drive Folder</DialogTitle>
                <DialogDescription>
                    Paste the shareable URL of a Google Drive folder. To remove a link, clear the URL and save.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>Ogeemo Folder</Label>
                    <Input value={folderToLink?.name || ''} readOnly disabled />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="drive-folder-link">Google Drive Folder URL</Label>
                    <Input id="drive-folder-link" value={driveFolderLink} onChange={(e) => setDriveFolderLink(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDriveLinkDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddFolderDriveLink}>Save Link</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete {selectedFileIds.length} file(s). This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
