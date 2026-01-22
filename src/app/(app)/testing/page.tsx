
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LoaderCircle,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { type FileItem } from '@/data/files';
import { useToast } from '@/hooks/use-toast';
import { 
    findOrCreateFileFolder,
    getFilesForFolder,
    addFileRecord,
    importFromGoogleDriveUrl
} from '@/services/file-service';
import { useAuth } from '@/context/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FolderItem } from '@/data/files';
import { Input } from '@/components/ui/input';
import { Link as LinkIcon } from 'lucide-react';

const GDRIVE_FILES_FOLDER_NAME = "Gdrive files";

export default function TestingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [gdriveFolder, setGdriveFolder] = useState<FolderItem | null>(null);
  const [filesInGdriveFolder, setFilesInGdriveFolder] = useState<FileItem[]>([]);
  const [gdriveUrl, setGdriveUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const loadInitialData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const folder = await findOrCreateFileFolder(user.uid, GDRIVE_FILES_FOLDER_NAME);
        setGdriveFolder(folder);
        
        const files = await getFilesForFolder(user.uid, folder.id);
        setFilesInGdriveFolder(files);

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Failed to load data",
            description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  
  const handleOpenApp = (file: FileItem) => {
      const url = `https://docs.google.com/document/d/${file.googleFileId}`;
      window.open(url, '_blank', 'noopener,noreferrer');
  };
  
   const handleImportFromDrive = async () => {
    if (!gdriveUrl.trim()) {
        toast({ variant: 'destructive', title: 'URL required', description: 'Please paste a Google Drive file URL.' });
        return;
    }
    setIsImporting(true);
    try {
        const result = await importFromGoogleDriveUrl(gdriveUrl);
        toast({ title: 'Import Successful', description: result.message });
        setGdriveUrl('');
        loadInitialData();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
    } finally {
        setIsImporting(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center p-4">
            <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col items-center">
        <header className="text-center mb-6">
            <h1 className="text-3xl font-bold font-headline text-primary">Testing Page</h1>
            <p className="text-muted-foreground">Google Sync Testing Area</p>
        </header>
        
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>{gdriveFolder?.name || "Gdrive files"}</CardTitle>
                <CardDescription>This folder will contain references to your Google Drive files.</CardDescription>
                 <div className="pt-2">
                    <div className="flex w-full items-center space-x-2">
                        <Input
                            placeholder="Paste Google Drive file URL here..."
                            value={gdriveUrl}
                            onChange={(e) => setGdriveUrl(e.target.value)}
                            disabled={isImporting}
                        />
                        <Button onClick={handleImportFromDrive} disabled={isImporting}>
                            {isImporting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                            Import
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mt-4 space-y-2 border rounded-md p-2 min-h-48">
                    {filesInGdriveFolder.length > 0 ? (
                        filesInGdriveFolder.map(file => (
                             <div key={file.id} className="flex items-center gap-2 p-2 border rounded-md bg-background group">
                                <span className="text-sm truncate flex-1">{file.name}</span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => handleOpenApp(file)}>
                                            <ExternalLink className="mr-2 h-4 w-4" /> Open
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground pt-16">
                            <p>No files imported yet.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
  );
}
