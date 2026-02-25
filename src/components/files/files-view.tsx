'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDrag, useDrop } from 'react-dnd';
import {
  Folder,
  File as FileIconLucide,
  LoaderCircle,
  FolderPlus,
  ChevronRight,
  MoreVertical,
  Trash2,
  Users,
  Plus,
  GitMerge,
  Pencil,
  Files,
  Check,
  ChevronsUpDown,
  X,
  Mail,
  Calendar,
  FileDigit,
  Briefcase,
  FilePlus,
  FileText,
  Sheet,
  Presentation,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowDownUp,
  Link as LinkIcon,
  Info,
  Save,
  BookOpen,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type FileItem, type FolderItem } from '@/data/files';
import { useToast } from '@/hooks/use-toast';
import { getFolders, addFolder, updateFolder, deleteFolders, ensureDocumentSystemFolders } from '@/services/file-manager-folders';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from '../ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from 'next/link';

const ItemTypes = {
  FILE: 'file',
  FOLDER: 'folder',
};

type DroppableItem = (FileItem & { type?: string }) | (FolderItem & { type: 'folder' });

const newFileSchema = z.object({
    fileName: z.string().min(1, 'File name is required.'),
    fileType: z.enum(['file', 'link']),
    fileUrl: z.string().optional(),
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

// --- Externalized Sub-components ---

const DraggableFileRow = ({ file, isHighlighted, children }: { file: FileItem, isHighlighted?: boolean, children: React.ReactNode }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.FILE,
        item: file,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [file]);

    return (
        <div ref={drag} className={cn(isDragging && 'opacity-50', isHighlighted && "bg-primary/10 animate-pulse ring-2 ring-primary ring-inset")}>
            {children}
        </div>
    );
};

const FolderTreeItem = ({ 
    folder, 
    allFolders, 
    level = 0, 
    selectedFolderId, 
    expandedFolders, 
    onSelectFolder, 
    onToggleExpand, 
    onRenameStart, 
    onDrop, 
    onAddSubfolder,
    onLinkDrive,
    onDelete,
    renamingFolderId,
    renameInputValue,
    onRenameChange,
    onRenameConfirm,
    onRenameCancel,
    sortDirection
}: { 
    folder: FolderItem, 
    allFolders: FolderItem[], 
    level?: number,
    selectedFolderId: string,
    expandedFolders: Set<string>,
    onSelectFolder: (id: string) => void,
    onToggleExpand: (id: string) => void,
    onRenameStart: (folder: FolderItem) => void,
    onDrop: (item: DroppableItem, targetFolderId: string) => void,
    onAddSubfolder: (parentId: string) => void,
    onLinkDrive: (folder: FolderItem) => void,
    onDelete: (folder: FolderItem) => void,
    renamingFolderId: string | null,
    renameInputValue: string,
    onRenameChange: (val: string) => void,
    onRenameConfirm: () => void,
    onRenameCancel: () => void,
    sortDirection: 'asc' | 'desc'
}) => {
    const hasChildren = allFolders.some(f => f.parentId === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isRenaming = renamingFolderId === folder.id;
    const isSystem = !!folder.isSystem;

    const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
      type: ItemTypes.FOLDER,
      item: { ...folder, type: ItemTypes.FOLDER },
      canDrag: !isRenaming && !isSystem,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }), [folder, isRenaming, isSystem]);

    const [{ canDrop, isOver }, drop] = useDrop(() => ({
      accept: [ItemTypes.FILE, ItemTypes.FOLDER],
      drop: (item: DroppableItem) => onDrop(item, folder.id),
      collect: (monitor) => ({ 
          isOver: monitor.isOver({ shallow: true }), 
          canDrop: monitor.canDrop() 
      }),
    }), [folder.id, onDrop]);

    const handleFolderClick = (e: React.MouseEvent) => {
        if (isRenaming) return;
        onSelectFolder(folder.id);
    };

    return (
      <div style={{ marginLeft: level > 0 ? '1rem' : '0' }} className="my-0.5">
        <div
          ref={node => drag(drop(node))}
          className={cn(
            "flex items-center justify-between border border-black rounded-md h-8 group",
            isRenaming ? 'bg-background' : 'hover:bg-accent',
            (isOver && canDrop) && 'bg-primary/20 ring-1 ring-primary',
            isDragging && 'opacity-50',
            selectedFolderId === folder.id && !isRenaming && 'bg-accent'
          )}
        >
             <div className="flex items-center flex-1 min-w-0 h-full pl-1 cursor-pointer" onClick={handleFolderClick}>
                {hasChildren ? (
                    <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-90')} onClick={(e) => { e.stopPropagation(); onToggleExpand(folder.id); }} />
                ) : <div className="w-4" />}
                <Folder className={cn("h-4 w-4 ml-1", isSystem ? "text-primary/70" : "text-primary")} />
                 {isRenaming ? (
                    <Input autoFocus value={renameInputValue} onChange={e => onRenameChange(e.target.value)} onBlur={onRenameConfirm} onKeyDown={e => { if (e.key === 'Enter') onRenameConfirm(); if (e.key === 'Escape') onRenameCancel(); }} className="h-full py-0 px-2 text-xs font-medium bg-transparent" onClick={e => e.stopPropagation()} />
                ) : (
                    <span className={cn("text-sm truncate ml-2 flex-1 flex items-center gap-1", isSystem && "font-bold")}>
                        {folder.name}
                    </span>
                )}
            </div>
            <div className="flex items-center">
                {folder.driveLink && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); window.open(folder.driveLink!, '_blank', 'noopener,noreferrer'); }}>
                    <LinkIcon className="h-4 w-4 text-blue-500" />
                  </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onSelect={() => onAddSubfolder(folder.id)}><FolderPlus className="mr-2 h-4 w-4" />Create subfolder</DropdownMenuItem>
                      {!isSystem && <DropdownMenuItem onSelect={() => onRenameStart(folder)}><Pencil className="mr-2 h-4 w-4" />Rename</DropdownMenuItem>}
                      <DropdownMenuItem onSelect={() => onLinkDrive(folder)}><LinkIcon className="mr-2 h-4 w-4" />Link Google Drive Folder</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {!isSystem ? (
                          <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.stopPropagation(); onDelete(folder); }}>
                              <Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                      ) : (
                          <DropdownMenuItem disabled className="text-xs text-muted-foreground italic">Protected System Folder</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        {isExpanded && allFolders.filter(f => f.parentId === folder.id).sort((a,b) => sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)).map(child => (
            <FolderTreeItem 
                key={child.id} 
                folder={child} 
                allFolders={allFolders} 
                level={level + 1} 
                selectedFolderId={selectedFolderId}
                expandedFolders={expandedFolders}
                onSelectFolder={onSelectFolder}
                onToggleExpand={onToggleExpand}
                onRenameStart={onRenameStart}
                onDrop={onDrop}
                onAddSubfolder={onAddSubfolder}
                onLinkDrive={onLinkDrive}
                onDelete={onDelete}
                renamingFolderId={renamingFolderId}
                renameInputValue={renameInputValue}
                onRenameChange={onRenameChange}
                onRenameConfirm={onRenameConfirm}
                onRenameCancel={onRenameCancel}
                sortDirection={sortDirection}
            />
        ))}
      </div>
    );
};

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
  const [folderSortDirection, setFolderSortDirection] = useState<'asc' | 'desc'>('asc');
  const [fileSortConfig, setFileSortConfig] = useState<{ key: 'name' | 'modifiedAt'; direction: 'asc' | 'desc' }>({ key: 'modifiedAt', direction: 'desc' });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedId = searchParams ? searchParams.get('highlight') : null;
  const fileRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const form = useForm<NewFileFormData>({
    resolver: zodResolver(newFileSchema),
    defaultValues: { fileName: '', fileType: 'file', fileUrl: '', targetFolderId: 'all' },
  });

  const loadData = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const allFolders = await ensureDocumentSystemFolders(user.uid);
      const fetchedFiles = await getFiles(user.uid);
      setFolders(allFolders);
      setFiles(fetchedFiles);
      if (allFolders.length > 0) {
        const rootFolder = allFolders.find(f => !f.parentId);
        if (rootFolder) setExpandedFolders(new Set([rootFolder.id]));
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally { setIsLoading(false); }
  }, [user, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filesInSelectedFolder = useMemo(() => {
    let list = selectedFolderId === 'all' ? files : files.filter(f => f.folderId === selectedFolderId);
    return list.sort((a, b) => {
        const { key, direction } = fileSortConfig;
        const valA = a[key];
        const valB = b[key];
        return direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [files, selectedFolderId, fileSortConfig]);

  const allVisibleSelected = filesInSelectedFolder.length > 0 && selectedFileIds.length === filesInSelectedFolder.length;

  useEffect(() => {
    if (highlightedId && !isLoading && files.length > 0) {
        const file = files.find(f => f.id === highlightedId);
        if (file) {
            setSelectedFolderId(file.folderId);
            const folder = folders.find(f => f.id === file.folderId);
            if (folder?.parentId) setExpandedFolders(p => new Set([...p, folder.parentId!]));
            
            const timeoutId = setTimeout(() => {
                const rowElement = fileRefs.current.get(highlightedId);
                if (rowElement) {
                    rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }
  }, [highlightedId, isLoading, files, folders]);

  const handleSelectFolder = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedFileIds([]);
  }, []);

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders(p => { const n = new Set(p); n.has(folderId) ? n.delete(folderId) : n.add(folderId); return n; });
  }, []);

  const handleDrop = useCallback(async (item: DroppableItem, newFolderId: string | null) => {
    if (!user) return;
    if (item.id === newFolderId) return;

    if ('type' in item && item.type === 'folder') {
        try {
            await updateFolder(item.id, { parentId: newFolderId });
            setFolders(prev => prev.map(f => f.id === item.id ? { ...f, parentId: newFolderId } : f));
            toast({ title: "Folder Moved" });
        } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
    } else {
        const movedFile = item as FileItem;
        if (movedFile.folderId === newFolderId) return;

        try {
            await updateFile(movedFile.id, { folderId: newFolderId! });
            setFiles(prev => prev.map(f => f.id === movedFile.id ? { ...f, folderId: newFolderId! } : f));
            toast({ title: "File Moved", description: `Moved to ${newFolderId ? (folders.find(f => f.id === newFolderId)?.name || 'folder') : 'root'}.` });
            setSelectedFileIds([]);
        } catch (e: any) { toast({ variant: "destructive", title: "Move Failed", description: e.message }); }
    }
  }, [user, toast, folders]);

  const [{ isOverRoot, canDropRoot }, dropRoot] = useDrop(() => ({
    accept: [ItemTypes.FILE, ItemTypes.FOLDER],
    drop: (item: DroppableItem) => handleDrop(item, null),
    collect: (monitor) => ({ 
        isOver: monitor.isOver({ shallow: true }), 
        canDrop: monitor.canDrop() 
    }),
  }), [handleDrop]);

  const handleRenameConfirm = useCallback(async () => {
    if (!renamingFolder || !renameInputValue.trim() || renamingFolder.name === renameInputValue.trim()) {
      setRenamingFolder(null); return;
    }
    try {
      await updateFolder(renamingFolder.id, { name: renameInputValue.trim() });
      setFolders(prev => prev.map(f => f.id === renamingFolder.id ? { ...f, name: renameInputValue.trim() } : f));
      toast({ title: "Folder Renamed" });
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
    finally { setRenamingFolder(null); }
  }, [renamingFolder, renameInputValue, toast]);

  const handleFileRenameConfirm = useCallback(async () => {
    if (!renamingFile || !renameFileValue.trim() || renamingFile.name === renameFileValue.trim()) {
        setRenamingFile(null); return;
    }
    try {
        await updateFile(renamingFile.id, { name: renameFileValue.trim() });
        setFiles(prev => prev.map(f => f.id === renamingFile.id ? { ...f, name: renameFileValue.trim() } : f));
        toast({ title: "File Renamed" });
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
    finally { setRenamingFile(null); }
  }, [renamingFile, renameFileValue, toast]);

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
          const newFolder = await addFolder({
              name: newFolderName.trim(),
              userId: user.uid,
              parentId: newFolderParentId,
              driveLink: newFolderDriveLink.trim() || undefined
          });
          setFolders(prev => [...prev, newFolder]);
          toast({ title: "Folder Created" });
          setIsNewFolderDialogOpen(false);
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
          setIsCreatingFolder(false);
      }
  };

  const handleConfirmDeleteFolder = async () => {
      if (!user || !folderToDelete) return;
      try {
          await deleteFolders([folderToDelete.id]);
          setFolders(prev => prev.filter(f => f.id !== folderToDelete.id));
          if (selectedFolderId === folderToDelete.id) setSelectedFolderId('all');
          toast({ title: "Folder Deleted" });
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
          setFolderToDelete(null);
      }
  };

  const handleConfirmDeleteFile = async () => {
      if (!fileToDelete) return;
      try {
          await deleteFiles([fileToDelete.id]);
          setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
          toast({ title: "File Deleted" });
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
          setFileToDelete(null);
      }
  };

  const handleConfirmBulkDelete = async () => {
      if (selectedFileIds.length === 0) return;
      try {
          await deleteFiles(selectedFileIds);
          setFiles(prev => prev.filter(f => !selectedFileIds.includes(f.id)));
          toast({ title: `${selectedFileIds.length} files deleted.` });
          setSelectedFileIds([]);
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
          setIsBulkDeleteAlertOpen(false);
      }
  };

  const handleLinkDriveFolder = async () => {
      if (!folderToLink) return;
      try {
          await updateFolder(folderToLink.id, { driveLink: driveFolderLink.trim() || undefined });
          setFolders(prev => prev.map(f => f.id === folderToLink.id ? { ...f, driveLink: driveFolderLink.trim() || undefined } : f));
          toast({ title: "Drive Link Updated" });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
          setIsDriveLinkDialogOpen(false);
          setFolderToLink(null);
      }
  };

  const handleLinkDriveFile = async () => {
      if (!fileToLink) return;
      try {
          const type = driveFileLink.trim() ? 'google-drive-link' : 'text/plain';
          await updateFile(fileToLink.id, { driveLink: driveFileLink.trim() || undefined, type });
          setFiles(prev => prev.map(f => f.id === fileToLink.id ? { ...f, driveLink: driveFileLink.trim() || undefined, type } : f));
          toast({ title: "Drive Link Updated" });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
          setIsDriveFileLinkDialogOpen(false);
          setFileToLink(null);
      }
  };

  async function onNewFileSubmit(values: NewFileFormData) {
      if (!user) return;
      setIsSaving(true);
      try {
          const folderId = values.targetFolderId === 'all' ? (folders.find(f => !f.parentId)?.id || '') : values.targetFolderId;
          const newFile: Omit<FileItem, 'id'> = {
              name: values.fileName,
              userId: user.uid,
              folderId: folderId,
              type: values.fileType === 'link' ? 'url-link' : 'text/plain',
              size: 0,
              modifiedAt: new Date(),
              storagePath: '',
              driveLink: values.fileType === 'link' ? values.fileUrl : undefined,
          };
          const savedFile = await addFileRecord(newFile);
          setFiles(prev => [...prev, savedFile]);
          toast({ title: "File Created" });
          setIsNewFileDialogOpen(false);
          form.reset();
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
          setIsSaving(false);
      }
  }

  return (
    <>
    <div className="p-4 sm:p-6 space-y-4">
        <header className="text-center relative">
            <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-bold font-headline text-primary">Document Manager</h1>
                 <Button asChild variant="ghost" size="icon">
                    <Link href="/document-manager/instructions">
                        <Info className="h-5 w-5 text-muted-foreground" />
                    </Link>
                 </Button>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">An integration hub to manage Google Drive Files &amp; Folders</p>
        </header>

        <Card>
            <CardHeader className="p-2">
                <div className="grid grid-cols-2 gap-2">
                    <Button className="flex-1" onClick={() => handleOpenNewFolderDialog(null)}>
                        <FolderPlus className="mr-2 h-4 w-4"/> New Folder
                    </Button>
                    <Button className="flex-1" onClick={() => setIsNewFileDialogOpen(true)}>
                        <FilePlus className="mr-2 h-4 w-4"/> New File
                    </Button>
                </div>
            </CardHeader>
        </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="md:col-span-1 flex flex-col gap-2">
            <div className="h-8 flex items-center p-1 border border-black bg-primary/10 rounded-md text-primary">
                <p className="flex-1 text-center font-semibold text-sm">Folders</p>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFolderSortDirection('asc')}><ArrowDownAZ className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFolderSortDirection('desc')}><ArrowUpZA className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="flex flex-col border border-black rounded-lg h-[calc(100vh-350px)]">
              <div
                ref={dropRoot}
                className={cn("p-2 border-b cursor-pointer transition-colors", selectedFolderId === 'all' && 'bg-primary/20', (isOverRoot && canDropRoot) && 'bg-primary/30 ring-1 ring-primary')}
                onClick={() => handleSelectFolder('all')}
              >
                  <Button variant="ghost" className="w-full justify-start gap-2 h-7"><Files className="h-4 w-4" />All Files</Button>
              </div>
              <ScrollArea className="flex-1 rounded-md p-2">
                  {folders.filter(f => !f.parentId).sort((a, b) => folderSortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)).map(folder => (
                    <FolderTreeItem 
                        key={folder.id} 
                        folder={folder} 
                        allFolders={folders} 
                        level={0} 
                        selectedFolderId={selectedFolderId}
                        expandedFolders={expandedFolders}
                        onSelectFolder={handleSelectFolder}
                        onToggleExpand={handleToggleExpand}
                        onRenameStart={(f) => { setRenamingFolder(f); setRenameInputValue(f.name); }}
                        onDrop={handleDrop}
                        onAddSubfolder={handleOpenNewFolderDialog}
                        onLinkDrive={(f) => { setFolderToLink(f); setDriveFolderLink(f.driveLink || ''); setIsDriveLinkDialogOpen(true); }}
                        onDelete={setFolderToDelete}
                        renamingFolderId={renamingFolder?.id || null}
                        renameInputValue={renameInputValue}
                        onRenameChange={setRenameInputValue}
                        onRenameConfirm={handleRenameConfirm}
                        onRenameCancel={() => setRenamingFolder(null)}
                        sortDirection={folderSortDirection}
                    />
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
                            <Trash2 className="mr-2 h-3 w-3" /> Delete Selected
                        </Button>
                     </div>
                ) : (
                    <p className="flex-1 text-center font-semibold text-sm">Files</p>
                )}
                 <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFileSortConfig({ key: 'name', direction: fileSortConfig.direction === 'asc' ? 'desc' : 'asc' })}><ArrowDownUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFileSortConfig({ key: 'modifiedAt', direction: fileSortConfig.direction === 'asc' ? 'desc' : 'asc' })}><ArrowDownUp className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="flex flex-col border border-black rounded-lg h-[calc(100vh-350px)]">
                <ScrollArea className="flex-1">
                  <div className="p-0">
                    {filesInSelectedFolder.length > 0 ? (
                        filesInSelectedFolder.map((file) => (
                           <DraggableFileRow key={file.id} file={file} isHighlighted={highlightedId === file.id}>
                            <div className="flex items-center border-b h-8 group p-2" ref={(el) => fileRefs.current.set(file.id, el)}>
                                <Checkbox
                                    checked={selectedFileIds.includes(file.id)}
                                    onCheckedChange={(checked) => {
                                        setSelectedFileIds(p => checked ? [...p, file.id] : p.filter(id => id !== file.id));
                                    }}
                                    className="mr-2"
                                />
                              <div className="flex items-center flex-1 min-w-0 h-full">
                                  <div className="flex items-center flex-1 min-w-0 cursor-pointer" onClick={() => {
                                      if (file.driveLink) window.open(file.driveLink, '_blank', 'noopener,noreferrer');
                                      else { setFileToLink(file); setDriveFileLink(''); setIsDriveFileLinkDialogOpen(true); }
                                  }}>
                                    <FileIconLucide className="h-4 w-4 text-primary" />
                                    {renamingFile?.id === file.id ? (
                                        <Input 
                                            autoFocus 
                                            value={renameFileValue} 
                                            onChange={(e) => setRenameFileValue(e.target.value)} 
                                            onBlur={handleFileRenameConfirm} 
                                            onKeyDown={(e) => { 
                                                if (e.key === 'Enter') handleFileRenameConfirm(); 
                                                if (e.key === 'Escape') setRenamingFile(null); 
                                            }} 
                                            className="h-7 py-0 px-2 text-xs font-medium ml-2" 
                                            onClick={(e) => e.stopPropagation()} 
                                        />
                                    ) : (
                                        <span className="text-xs font-medium truncate ml-2">
                                            {file.name}
                                            {file.driveLink && <LinkIcon className="h-3 w-3 ml-1.5 text-blue-500 inline-block" />}
                                        </span>
                                    )}
                                  </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => { setRenamingFile(file); setRenameFileValue(file.name); }}><Pencil className="mr-2 h-4 w-4"/>Rename</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => { setFileToLink(file); setDriveFileLink(file.driveLink || ''); setIsDriveFileLinkDialogOpen(true); }}><LinkIcon className="mr-2 h-4 w-4"/>Link Google Drive File</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setFileToDelete(file)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                           </DraggableFileRow>
                        ))
                    ) : <div className="text-center text-sm text-muted-foreground p-4">No files found.</div>}
                  </div>
                </ScrollArea>
              </div>
        </div>
      </div>
    </div>
    
    <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="folder-name">Folder Name</Label>
                    <Input id="folder-name" placeholder="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="folder-drive">Google Drive Link (Optional)</Label>
                    <Input id="folder-drive" placeholder="Google Drive Link" value={newFolderDriveLink} onChange={e => setNewFolderDriveLink(e.target.value)} />
                </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder} disabled={isCreatingFolder}>Create</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Create New File</DialogTitle></DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onNewFileSubmit)} className="space-y-4 py-2">
                    <FormField control={form.control} name="fileName" render={({ field }) => ( <FormItem><FormLabel>File Name</FormLabel><FormControl><Input placeholder="e.g., Marketing Strategy" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="fileType" render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>File Creation Mode</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="file" /></FormControl><FormLabel className="font-normal">Text File (Internal)</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="link" /></FormControl><FormLabel className="font-normal">Custom URL Link</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                        </FormItem>
                    )} />
                    {form.watch('fileType') === 'link' && ( <FormField control={form.control} name="fileUrl" render={({ field }) => ( <FormItem><FormLabel>URL</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem> )} /> )}
                    <FormField control={form.control} name="targetFolderId" render={({ field }) => ( <FormItem><FormLabel>Destination Folder</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select folder..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="all">Unassigned (Root)</SelectItem>{folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsNewFileDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>Create File</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    </Dialog>

    <Dialog open={isDriveLinkDialogOpen} onOpenChange={setIsDriveLinkDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Link to Google Drive Folder</DialogTitle></DialogHeader>
            <div className="py-4 space-y-2">
                <Label>Folder URL</Label>
                <Input value={driveFolderLink} onChange={e => setDriveFolderLink(e.target.value)} placeholder="https://drive.google.com/..." />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDriveLinkDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleLinkDriveFolder}>Save Link</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={isDriveFileLinkDialogOpen} onOpenChange={setIsDriveFileLinkDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Link to Google Drive File</DialogTitle></DialogHeader>
            <div className="py-4 space-y-2">
                <Label>File URL</Label>
                <Input value={driveFileLink} onChange={e => setDriveFileLink(e.target.value)} placeholder="https://docs.google.com/..." />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDriveFileLinkDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleLinkDriveFile}>Save Link</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <AlertDialog open={!!folderToDelete} onOpenChange={setFolderToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Delete "{folderToDelete?.name}" and all subfolders?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteFolder} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!fileToDelete} onOpenChange={setFileToDelete}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete File?</AlertDialogTitle><AlertDialogDescription>Permanently delete "{fileToDelete?.name}"?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteFile} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Multiple Files?</AlertDialogTitle><AlertDialogDescription>Delete {selectedFileIds.length} selected file(s)?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">Delete All</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
