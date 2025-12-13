
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  FileText,
  Plus,
  Trash2,
  Edit,
  Save,
  Printer,
  File as FileIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { findOrCreateFileFolder, getFilesForFolder, updateFile, addTextFileClient, deleteFiles } from '@/services/file-service';
import { fetchFileContent } from '@/app/actions/file-actions';
import { type FileItem, type FolderItem } from '@/data/files';
import { LoaderCircle } from 'lucide-react';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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


const TEST_FOLDER_NAME = "Bug Repair Tests";

export default function BugRepairPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { handlePrint, contentRef } = useReactToPrint();
  
  const [currentFile, setCurrentFile] = useState<FileItem | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [testFolder, setTestFolder] = useState<FolderItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  const loadFiles = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const folder = await findOrCreateFileFolder(user.uid, TEST_FOLDER_NAME);
        setTestFolder(folder);
        const fetchedFiles = await getFilesForFolder(user.uid, folder.id);
        setFiles(fetchedFiles.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()));
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Failed to load test files", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleSelectFile = useCallback(async (file: FileItem) => {
    setCurrentFile(file);
    if (editorRef.current) editorRef.current.innerHTML = '<p>Loading...</p>';

    try {
      const { content, error } = await fetchFileContent(file.id);
      if (error) throw new Error(error);
      if (editorRef.current) {
        editorRef.current.innerHTML = content || '';
      }
    } catch (error: any) {
        if (editorRef.current) editorRef.current.innerHTML = '';
        toast({ variant: 'destructive', title: "Error loading file", description: error.message });
    }
  }, [toast]);

  const handleSave = async () => {
    if (!user || !testFolder) {
        toast({ variant: 'destructive', title: 'You must be logged in to save.'});
        return;
    }
    const content = editorRef.current?.innerHTML || '';
    if (!content.trim()) {
        toast({ variant: 'destructive', title: 'Cannot save empty content.' });
        return;
    }

    setIsSaving(true);
    try {
        if (currentFile) {
            // Update existing file
            await updateFile(currentFile.id, { content });
            toast({ title: "Content Updated", description: `Your changes to "${currentFile.name}" have been saved.` });
        } else {
            // Create new file
            const newFile = await addTextFileClient(
                user.uid,
                testFolder.id,
                `Test Document ${new Date().toLocaleTimeString()}`,
                content
            );
            setCurrentFile(newFile);
            toast({ title: "Content Saved", description: `A new test file has been created.` });
        }
        await loadFiles();
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Save Failed", description: error.message || 'An unknown error occurred.' });
    } finally {
        setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setCurrentFile(null);
    toast({ title: "Editor Cleared", description: "Ready for a new note." });
  };
  
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    try {
        await deleteFiles([fileToDelete.id]);
        if (currentFile?.id === fileToDelete.id) {
            handleClear();
        }
        await loadFiles();
        toast({ title: 'File Deleted' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setFileToDelete(null);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 h-full flex flex-col items-center">
        <header className="text-center mb-6">
            <h1 className="text-3xl font-bold font-headline text-primary">Isolated Text Editor</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A safe environment to build and test the file saving/loading system.
            </p>
        </header>
        
        <div className="flex w-full max-w-7xl flex-1 rounded-lg border">
            {/* Files Panel */}
            <div className="flex-shrink-0 w-80 border-r">
                <div className="flex flex-col h-full p-2">
                    <CardHeader className="p-2 text-center">
                        <CardTitle className="text-base">Saved Test Files</CardTitle>
                        <CardDescription className="text-xs">In folder: "{TEST_FOLDER_NAME}"</CardDescription>
                    </CardHeader>
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex h-full items-center justify-center">
                                <LoaderCircle className="h-6 w-6 animate-spin"/>
                            </div>
                        ) : (
                            files.map(file => (
                                <div key={file.id} className={cn("flex items-center p-2 rounded-md cursor-pointer group", currentFile?.id === file.id && "bg-accent")} onClick={() => handleSelectFile(file)}>
                                    <FileIcon className="h-4 w-4 mr-2" />
                                    <span className="flex-1 text-sm whitespace-nowrap truncate">{file.name}</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setFileToDelete(file); }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Editor Panel */}
            <div className="flex-1 flex flex-col">
              <div ref={contentRef} className="h-full flex flex-col">
                <div className="p-4 border-b">
                    <h3 className="font-semibold">{currentFile?.name || 'New Note'}</h3>
                    <p className="text-sm text-muted-foreground">Any changes made here are auto-saved. Click "Save" to commit changes manually.</p>
                </div>
                <div
                    ref={editorRef}
                    contentEditable
                    className="prose dark:prose-invert max-w-none flex-1 p-4 focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Start typing here..."
                />
                <div className="p-4 border-t flex justify-end gap-2">
                    <Button variant="outline" onClick={handlePrint} disabled={isSaving}><Printer className="mr-2 h-4 w-4" /> Print</Button>
                    <Button variant="outline" onClick={handleClear} disabled={isSaving}><Trash2 className="mr-2 h-4 w-4" /> Clear</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                </div>
              </div>
            </div>
        </div>
      </div>
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the file "{fileToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

