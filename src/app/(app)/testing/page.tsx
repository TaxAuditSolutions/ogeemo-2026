
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

declare global {
  interface Window {
    gapi: any;
  }
  namespace google {
    namespace picker {
      class PickerBuilder {
        addView(view: any): this;
        setOAuthToken(token: string): this;
        setDeveloperKey(key: string): this;
        setAppId(id: string): this;
        setCallback(callback: (data: any) => void): this;
        build(): Picker;
      }
      class Picker {
        setVisible(visible: boolean): void;
      }
      const ViewId: {
        DOCS: any;
      };
      const Action: {
        PICKED: any;
      };
      interface ResponseObject {
        action: any;
        docs: DocumentObject[];
      }
      interface DocumentObject {
        id: string;
        name: string;
        mimeType: string;
        url: string;
        sizeBytes?: number;
      }
    }
  }
}


const GDRIVE_FILES_FOLDER_NAME = "Gdrive files";


export default function TestingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [gdriveFolder, setGdriveFolder] = useState<FolderItem | null>(null);
  const [filesInGdriveFolder, setFilesInGdriveFolder] = useState<FileItem[]>([]);
  const pickerApiLoaded = useRef(false);

  const { user, getGoogleAccessToken } = useAuth();
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

  const handleImportClick = async () => {
      if (!user) return;
      
      try {
          const accessToken = await getGoogleAccessToken();
          if (!accessToken) {
              throw new Error("Could not get Google access token.");
          }
          loadPickerApi(() => createPicker(accessToken));
      } catch (error: any) {
           toast({
              variant: "destructive",
              title: "Import Failed",
              description: error.message || "Could not initiate import process.",
          });
      }
  };

  const loadPickerApi = (callback: () => void) => {
      if (pickerApiLoaded.current) {
          callback();
          return;
      }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
          window.gapi.load('picker', { 'callback': () => {
              pickerApiLoaded.current = true;
              callback();
          }});
      };
      document.body.appendChild(script);
  };
  
  const createPicker = (accessToken: string) => {
    const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!user || !GOOGLE_API_KEY || !GOOGLE_APP_ID) {
      toast({ variant: 'destructive', title: 'Configuration Error', description: 'Missing Google API configuration.' });
      return;
    }

    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.DOCS)
      .setOAuthToken(accessToken)
      .setDeveloperKey(GOOGLE_API_KEY)
      .setAppId(GOOGLE_APP_ID)
      .setCallback(async (data: google.picker.ResponseObject) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs[0];
          
          if (!gdriveFolder) {
              toast({ variant: 'destructive', title: 'Error', description: 'Could not find the Gdrive folder to save the file reference.' });
              return;
          }
          
          try {
              const newFileRecord: Omit<FileItem, 'id'> = {
                  name: doc.name,
                  type: doc.mimeType,
                  size: doc.sizeBytes || 0,
                  modifiedAt: new Date(),
                  folderId: gdriveFolder.id,
                  userId: user!.uid,
                  storagePath: `gdrive/${doc.id}`, // Placeholder storage path for GDrive files
                  googleFileId: doc.id,
              };

              const savedFile = await addFileRecord(newFileRecord);
              setFilesInGdriveFolder(prev => [...prev, savedFile]);
              toast({ title: 'File Imported', description: `A reference to "${doc.name}" has been saved.` });

          } catch (error: any) {
              toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
          }
        }
      })
      .build();
    picker.setVisible(true);
  };
  
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
                    <Button onClick={handleImportClick} disabled={isLoading}>Import Files</Button>
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
