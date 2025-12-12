
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  FileText,
  Plus,
  Trash2,
  Edit,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/context/auth-context';
import { getTestFolders, addTestFolder, type TestFolder } from '@/services/folder-test-service';
import { getFiles, updateFile, addTextFileClient, deleteFiles } from '@/services/file-service';
import { fetchFileContent } from '@/app/actions/file-actions';
import { type FileItem } from '@/data/files';
import { LoaderCircle } from 'lucide-react';


export default function TestNotes1Page() {
  const [folders, setFolders] = useState<TestFolder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [currentFileContent, setCurrentFileContent] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const [folderToDelete, setFolderToDelete] = useState<TestFolder | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileFolderId, setNewFileFolderId] = useState<string>("");


  // --- Data Persistence (Firebase) ---
  const loadData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const [fetchedFolders, fetchedFiles] = await Promise.all([
        getTestFolders(user.uid),
        getFiles(user.uid),
      ]);
      setFolders(fetchedFolders);
      setFiles(fetchedFiles);
      if (fetchedFolders.length > 0 && !selectedFolderId) {
        setSelectedFolderId(fetchedFolders[0].id);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load data from Firebase.' });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast, selectedFolderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleSelectFile = useCallback(async (file: FileItem) => {
    setSelectedFile(file);
    setCurrentFileContent(''); // Show loading state
    try {
        const { content, error } = await fetchFileContent(file.id);
        if (error) throw new Error(error);
        
        setCurrentFileContent(content || '');
        if (editorRef.current) {
            editorRef.current.innerHTML = content || '';
        }
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error loading file', description: error.message });
        setCurrentFileContent('Error loading content.');
    }
  }, [toast]);

  // --- Folder Management (Firebase) ---
  const handleAddFolder = () => {
    setNewFolderName("");
    setIsNewFolderDialogOpen(true);
  };

  const handleConfirmCreateFolder = async () => {
    if (!user || !newFolderName.trim()) {
        toast({ variant: "destructive", title: "Folder name is required." });
        return;
    }
    try {
        const newFolder = await addTestFolder({ name: newFolderName.trim(), userId: user.uid, parentId: null });
        setFolders(prev => [...prev, newFolder]);
        setSelectedFolderId(newFolder.id);
        setIsNewFolderDialogOpen(false);
        toast({ title: "Folder Created" });
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Failed to create folder', description: e.message });
    }
  };

  const handleStartRenameFolder = (folder: TestFolder) => {
    setRenamingFolderId(folder.id);
    setTempName(folder.name);
  };
  
  const handleConfirmRenameFolder = async () => {
    // This function will need to be updated to use a new service for renaming test folders
    console.log("Renaming folder is not implemented with the new service yet.");
    setRenamingFolderId(null);
  };

  const handleConfirmDeleteFolder = async () => {
    // This function will need to be updated to use a new service for deleting test folders
    console.log("Deleting folder is not implemented with the new service yet.");
    setFolderToDelete(null);
  };

  // --- File Management (Firebase) ---
  const handleAddFile = () => {
    if (!selectedFolderId) {
      toast({ variant: 'destructive', title: 'No folder selected', description: 'Please select or create a folder first.' });
      return;
    }
    setNewFileName("");
    setNewFileFolderId(selectedFolderId);
    setIsNewFileDialogOpen(true);
  };

  const handleConfirmCreateFile = async () => {
    if (!user || !newFileName.trim() || !newFileFolderId) {
        toast({ variant: "destructive", title: "File name and folder are required." });
        return;
    }
    try {
        const newFile = await addTextFileClient(user.uid, newFileFolderId, newFileName.trim());
        setFiles(prev => [...prev, newFile]);
        handleSelectFile(newFile);
        setIsNewFileDialogOpen(false);
        toast({ title: "File Created", description: "You can now add content to your new file." });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed to create file', description: e.message });
    }
  };

  const handleStartRenameFile = (file: FileItem) => {
    setRenamingFileId(file.id);
    setTempName(file.name);
  };

  const handleConfirmRenameFile = async () => {
    if (!renamingFileId || !tempName.trim()) {
        setRenamingFileId(null);
        return;
    };
    try {
        await updateFile(renamingFileId, { name: tempName.trim(), modifiedAt: new Date() });
        setFiles(prev => prev.map(f => f.id === renamingFileId ? { ...f, name: tempName.trim(), modifiedAt: new Date() } : f));
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Rename Failed', description: e.message });
    } finally {
        setRenamingFileId(null);
    }
  };

  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
        await deleteFiles([fileToDelete.id]);
        setFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
        if (selectedFile?.id === fileToDelete.id) {
            setSelectedFile(null);
            setCurrentFileContent('');
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: e.message });
    } finally {
        setFileToDelete(null);
    }
  };

  const filesForSelectedFolder = files.filter(f => f.folderId === selectedFolderId).sort((a,b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  
  // --- Editor Logic (Firebase) ---
  const handleManualSave = async () => {
    if (selectedFile && editorRef.current) {
        const newContent = editorRef.current.innerHTML;
        try {
            await updateFile(selectedFile.id, { content: newContent });
            setCurrentFileContent(newContent);
            toast({ title: "File Saved", description: `"${selectedFile.name}" has been saved.`});
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save failed', description: e.message });
        }
    }
  };

  const handleEditorInput = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
        if (selectedFile && editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            if (newContent === currentFileContent) return; // No changes to save
            
            try {
                await updateFile(selectedFile.id, { content: newContent });
                setCurrentFileContent(newContent);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Auto-save failed', description: e.message });
            }
        }
    }, 1000); // Autosave after 1 second of inactivity
  };
  
  useEffect(() => {
    // Clear the timer when the component unmounts
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
    handleEditorInput(); // Trigger autosave after formatting
  };
  
  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <>
      <div className="p-4 sm:p-6 h-full flex flex-col items-center">
        <header className="flex items-center justify-between mb-6 w-full max-w-7xl">
            <div className="w-1/4">
                <Button onClick={handleAddFolder}><Plus className="mr-2 h-4 w-4" /> New Folder</Button>
            </div>
            <div className="text-center flex-1">
                <h1 className="text-2xl font-bold font-headline text-primary">Firebase Notes</h1>
                <p className="text-muted-foreground">All data is saved to Firestore & Firebase Storage.</p>
            </div>
            <div className="w-1/4 flex justify-end">
                <Button onClick={handleAddFile} disabled={!selectedFolderId}><Plus className="mr-2 h-4 w-4" /> New File</Button>
            </div>
        </header>

        <div className="flex w-full max-w-7xl flex-1 rounded-lg border">
          {/* Folders Panel */}
          <div className="flex-shrink-0 w-64 border-r">
            <div className="p-2 space-y-2 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {folders.map(folder => (
                  <div key={folder.id} className={cn("flex items-center p-2 rounded-md cursor-pointer group", selectedFolderId === folder.id && "bg-accent")}>
                    <Folder className="h-4 w-4 mr-2" />
                    {renamingFolderId === folder.id ? (
                        <Input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={handleConfirmRenameFolder} onKeyDown={e => e.key === 'Enter' && handleConfirmRenameFolder()} className="h-7" />
                    ) : (
                        <span onClick={() => setSelectedFolderId(folder.id)} className="flex-1 text-sm whitespace-nowrap">{folder.name}</span>
                    )}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartRenameFolder(folder)}><Edit className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFolderToDelete(folder)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Files Panel */}
          <div className="flex-shrink-0 w-72 border-r">
             <div className="p-2 space-y-2 h-full flex flex-col">
               <div className="flex-1 overflow-y-auto">
                {filesForSelectedFolder.map(file => (
                    <div key={file.id} className={cn("flex items-center p-2 rounded-md cursor-pointer group", selectedFile?.id === file.id && "bg-accent")}>
                        {renamingFileId === file.id ? (
                           <Input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={handleConfirmRenameFile} onKeyDown={e => e.key === 'Enter' && handleConfirmRenameFile()} className="h-7" />
                        ) : (
                           <span onClick={() => handleSelectFile(file)} className="flex-1 text-sm whitespace-nowrap">{file.name}</span>
                        )}
                    </div>
                ))}
              </div>
            </div>
          </div>

          {/* Editor Panel */}
          <div className="flex-1 flex flex-col">
            <div className="h-full flex flex-col">
                {selectedFile ? (
                    <>
                        <div className="p-2 border-b flex items-center gap-1 flex-wrap">
                            <Button variant="ghost" size="icon" title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('bold')}><Bold className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('italic')}><Italic className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('underline')}><Underline className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" title="Unordered List" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('insertUnorderedList')}><List className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" title="Ordered List" onMouseDown={(e) => e.preventDefault()} onClick={() => handleFormat('insertOrderedList')}><ListOrdered className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={handleManualSave} className="ml-auto"><Save className="mr-2 h-4 w-4"/>Save File</Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 prose dark:prose-invert max-w-none" ref={editorRef} contentEditable onInput={handleEditorInput} />
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">Select a file to start editing.</div>
                )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                    Enter a name for your new folder.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="folder-name-input">Folder Name</Label>
                <Input
                    id="folder-name-input"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={async (e) => { if (e.key === 'Enter') await handleConfirmCreateFolder() }}
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmCreateFolder}>Create</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-name">File Name</Label>
              <Input
                id="file-name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={async (e) => e.key === 'Enter' && await handleConfirmCreateFile()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-select">Folder</Label>
              <Select value={newFileFolderId} onValueChange={setNewFileFolderId}>
                <SelectTrigger id="folder-select">
                  <SelectValue placeholder="Select a folder..." />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewFileDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmCreateFile}>Create File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the folder "{folderToDelete?.name}" and all files inside it. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteFolder} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the file "{fileToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteFile} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
