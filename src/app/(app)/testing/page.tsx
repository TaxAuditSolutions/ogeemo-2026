
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
    addFileRecord
} from '@/services/file-service';
import { useAuth } from '@/context/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FolderItem } from '@/data/files';

const GDRIVE_FILES_FOLDER_NAME = "Gdrive files";

export default function TestingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [gdriveFolder, setGdriveFolder] = useState<FolderItem | null>(null);
  const [filesInGdriveFolder, setFilesInGdriveFolder] = useState<FileItem[]>([]);
  
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
      if (!file.name) {
          toast({ variant: 'destructive', title: 'File name missing', description: 'Cannot search for a file without a name.' });
          return;
      }
      const searchUrl = `https://drive.google.com/drive/search?q=${encodeURIComponent(file.name)}`;
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
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
                    <Button asChild>
                        <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer">
                            Open Google Drive
                        </a>
                    </Button>
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

    
