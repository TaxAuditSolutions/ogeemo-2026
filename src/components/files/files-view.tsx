'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Plus,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowDownUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type FileItem, type FolderItem } from '@/data/files';
import { useToast } from '@/hooks/use-toast';
import { getFolders, addFolder, updateFolder, deleteFolders } from '@/services/file-manager-folders';
import { getFiles, deleteFiles, updateFile, addTextFileClient, addFileRecord, getFileById } from '@/services/file-service';
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
import { AddUserDialog } from '../data/add-user-dialog';

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

// --- Externalized Sub-components ---

const DraggableFileRow = ({ file, children }: { file: FileItem, children: React.ReactNode }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.FILE,
        item: file,
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }), [file]);

    return (
        <div ref={drag} className={cn(isDragging && 'opacity-50')}>
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

    const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
      type: ItemTypes.FOLDER,
      item: { ...folder, type: ItemTypes.FOLDER },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }), [folder]);

    const [{ canDrop, isOver }, drop] = useDrop(() => ({
      accept: [ItemTypes.FILE, ItemTypes.FOLDER],
      drop: (item: DroppableItem) => onDrop(item, folder.id),
      collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    }), [folder.id, onDrop]);

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
             <div className="flex items-center flex-1 min-w-0 h-full pl-1 cursor-pointer" onClick={() => !isRenaming && onSelectFolder(folder.id)}>
                {hasChildren ? (
                    <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-90')} onClick={(e) => { e.stopPropagation(); onToggleExpand(folder.id); }} />
                ) : <div className="w-4" />}
                <Folder className="h-4 w-4 text-primary ml-1" />
                 {isRenaming ? (
                    <Input autoFocus value={renameInputValue} onChange={e => onRenameChange(e.target.value)} onBlur={onRenameConfirm} onKeyDown={e => { if (e.key === 'Enter') onRenameConfirm(); if (e.key === 'Escape') onRenameCancel(); }} className="h-full py-0 px-2 text-xs font-medium bg-transparent" onClick={e => e.stopPropagation()} />
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
                      <DropdownMenuItem onSelect={() => onAddSubfolder(folder.id)}><FolderPlus className="mr-2 h-4 w-4" />Create subfolder</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onRenameStart(folder)}><Pencil className="mr-2 h-4 w-4" />Rename</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onLinkDrive(folder)}><LinkIcon className="mr-2 h-4 w-4" />Link Google Drive Folder</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.stopPropagation(); onDelete(folder); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
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
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<FileItem | null>(null);
  const [isLoadingFileForEdit, setIsLoadingFileForEdit] = useState(false);
  const [folderSortDirection, setFolderSortDirection] = useState<'asc' | 'desc'>('asc');
  const [fileSortConfig, setFileSortConfig] = useState<{ key: 'name' | 'modifiedAt'; direction: 'asc' | 'desc' }>({ key: 'modifiedAt', direction: 'desc' });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<NewFileFormData>({
    resolver: zodResolver(newFileSchema),
    defaultValues: { fileName: '', fileType: 'file', fileUrl: '', gdriveFileType: 'doc', targetFolderId: 'all' },
  });

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
  const someVisibleSelected = selectedFileIds.length > 0 && !allVisibleSelected;

  const loadData = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [fetchedFolders, fetchedFiles] = await Promise.all([getFolders(user.uid), getFiles(user.uid)]);
      setFolders(fetchedFolders);
      setFiles(fetchedFiles);
      if (fetchedFolders.length > 0) {
        const rootFolder = fetchedFolders.find(f => !f.parentId);
        if (rootFolder) setExpandedFolders(new Set([rootFolder.id]));
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally { setIsLoading(false); }
  }, [user, toast]);

  useEffect(() => { loadData(); }, [loadData]);

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
        try {
            await updateFile(item.id, { folderId: newFolderId! });
            setFiles(prev => prev.map(f => f.id === item.id ? { ...f, folderId: newFolderId! } : f));
            toast({ title: "File Moved" });
        } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
    }
  }, [user, toast]);

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
          .sort((a, b) => folderSortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
          .flatMap(f => [{ folder: f, level }, ...flattenedFolders(folders, f.id, level + 1)]);
  };

  return (
    <>
    <div className="p-4 sm:p-6 space-y-4">
        <header className="text-center">
            <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-bold font-headline text-primary">Document Manager</h1>
                 <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)}>
                    <Info className="h-5 w-5 text-muted-foreground" />
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
                className={cn("p-2 border-b cursor-pointer", selectedFolderId === 'all' && 'bg-primary/20')}
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
                        selectedFolderId={selectedFolderId}
                        expandedFolders={expandedFolders}
                        onSelectFolder={handleSelectFolder}
                        onToggleExpand={handleToggleExpand}
                        onRenameStart={setRenamingFolder}
                        onDrop={handleDrop}
                        onAddSubfolder={(id) => { setNewFolderParentId(id); setIsNewFolderDialogOpen(true); }}
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
                           <DraggableFileRow key={file.id} file={file}>
                            <div className="flex items-center border-b h-8 group p-2" ref={(el) => fileRefs.current.set(file.id, el)}>
                                <Checkbox
                                    checked={selectedFileIds.includes(file.id)}
                                    onCheckedChange={(checked) => {
                                        setSelectedFileIds(p => checked ? [...p, file.id] : p.filter(id => id !== file.id));
                                    }}
                                    className="mr-2"
                                />
                              <div className="flex items-center flex-1 min-w-0 h-full cursor-pointer" onClick={() => {
                                  if (file.driveLink) window.open(file.driveLink, '_blank');
                                  else { setFileToLink(file); setDriveFileLink(''); setIsDriveFileLinkDialogOpen(true); }
                              }}>
                                <FileIconLucide className="h-4 w-4 text-primary" />
                                <span className="text-xs font-medium truncate ml-2">{file.name}</span>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setRenamingFile(file)}><Pencil className="mr-2 h-4 w-4"/>Rename</DropdownMenuItem>
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
                <Input placeholder="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
                <Input placeholder="Google Drive Link (Optional)" value={newFolderDriveLink} onChange={e => setNewFolderDriveLink(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder} disabled={isCreatingFolder}>Create</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete File?</AlertDialogTitle><AlertDialogDescription>Permanently delete "{fileToDelete?.name}"?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteFile} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
