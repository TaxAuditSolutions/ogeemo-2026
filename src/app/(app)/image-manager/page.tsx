
'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { FileUp, X, LoaderCircle, Save, Trash2, CheckCircle, ExternalLink } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { uploadSiteImage, deleteSiteImage } from '@/services/file-service';
import { useSiteImages } from '@/hooks/use-site-images';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SiteImage } from '@/hooks/use-site-images';

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
        setCallback(callback: (data: any) => void): this;
        build(): Picker;
      }
      class Picker {
        setVisible(visible: boolean): void;
      }
      class View {
        constructor(viewId: any);
        setMimeTypes(mimeTypes: string): this;
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

export default function ImageManagerPage() {
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{ id: string; storagePath: string } | null>(null);
  const pickerApiLoaded = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { user, getGoogleAccessToken } = useAuth();
  const { images, isLoading: isLoadingImages, loadImages } = useSiteImages();
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const replacementTargetId = searchParams.get('replace');
  const [imageToReplace, setImageToReplace] = useState<{id: string; image: SiteImage } | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const handleImportFromGoogleDrive = async () => {
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
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to use this feature.",
      });
      return;
    }

    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("image/png,image/jpeg,image/jpg,image/gif");

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setCallback(async (data: google.picker.ResponseObject) => {
        if (data.action === google.picker.Action.PICKED) {
          const doc = data.docs[0];
          setIsUploading(true);
          setStatus('Downloading from Google Drive...');
          try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!response.ok) {
              throw new Error('Failed to download file from Google Drive.');
            }

            const blob = await response.blob();
            const file = new File([blob], doc.name, { type: doc.mimeType });
            
            setStatus('Uploading to site library...');
            await uploadSiteImage(file, user.uid);

            toast({ title: 'Image Imported', description: `"${doc.name}" has been added to your library.` });
            loadImages();
          } catch (error: any) {
            toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
          } finally {
            setIsUploading(false);
            setStatus('');
          }
        }
      })
      .build();
    picker.setVisible(true);
  };
  
  const handleDelete = async () => {
    if (!imageToDelete) return;
    
    setIsDeleting(true);
    try {
        await deleteSiteImage(imageToDelete.id, imageToDelete.storagePath);
        toast({ title: 'Image Deleted' });
        setImageToDelete(null);
        loadImages();
    } catch (error: any) {
         const description = (error as any).details ? `${(error as any).message} Details: ${JSON.stringify((error as any).details)}` : (error as any).message;
         toast({ variant: 'destructive', title: 'Delete Failed', description });
    } finally {
        setIsDeleting(false);
    }
  };

  const handleConfirmReplacement = async () => {
    if (!imageToReplace || !replacementTargetId || !user) return;

    setIsReplacing(true);
    try {
        const { image } = imageToReplace;
        await uploadSiteImage(image.url, user.uid, replacementTargetId);
        toast({
            title: "Image Replaced",
            description: `The '${replacementTargetId}' image has been updated successfully.`
        });
        router.push('/website'); 
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Replacement Failed', description: error.message });
    } finally {
        setIsReplacing(false);
        setImageToReplace(null);
    }
  };


  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setPastedImage(file);
          setPreviewUrl(URL.createObjectURL(file));
          break;
        }
      }
    }
  };
  
  const handleSave = async () => {
    if (!pastedImage || !user) {
      toast({ variant: 'destructive', title: 'No image to save' });
      return;
    }
    
    setIsUploading(true);
    setStatus('Saving image...');
    try {
      await uploadSiteImage(pastedImage, user.uid);
      toast({ title: 'Image Saved', description: 'Your pasted image has been added to the library.' });
      setPastedImage(null);
      setPreviewUrl(null);
      loadImages(); // Refresh the library view
    } catch (error: any) {
      console.error("Save image error:", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsUploading(false);
      setStatus('');
    }
  };

  const handleFileSelectFromInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPastedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };


  return (
    <>
    <div className="p-4 sm:p-6 space-y-6">
      <SettingsPageHeader pageTitle="Image Manager" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Image Manager</h1>
        <p className="text-muted-foreground">Manage your site-wide images for heroes, logos, and more.</p>
      </header>
      
      {replacementTargetId && (
        <Card className="mb-6 bg-primary/10 border-primary">
            <CardHeader className="text-center">
                <CardTitle>Selection Mode</CardTitle>
                <CardDescription>Select an image from your library below to replace the "{replacementTargetId}" image.</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
                <Button variant="outline" onClick={() => router.push('/settings/site-images')}>Cancel Replacement</Button>
            </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add New Image</CardTitle>
          <CardDescription>
            Click to import an image from your Google Drive, or paste an image from your clipboard into the box below.
          </CardDescription>
        </CardHeader>
        <CardContent 
          onPaste={handlePaste} 
          className="space-y-4"
        >
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
          >
           {isUploading ? (
               <div className="flex flex-col items-center gap-2">
                   <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                   <p className="text-sm text-muted-foreground">{status}</p>
               </div>
           ) : previewUrl ? (
                <div className="relative w-full h-full">
                    <img src={previewUrl} alt="Pasted content" className="w-full h-full object-contain" />
                     <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPastedImage(null);
                          setPreviewUrl(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                </div>
           ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileUp className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload or paste image</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 5MB</p>
                </div>
           )}
           <input ref={fileInputRef} id="file-upload-input" type="file" className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleFileSelectFromInput} />
          </div>
          {previewUrl && (
             <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isUploading}>
                    {isUploading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Image
                  </Button>
              </div>
          )}
        </CardContent>
         <CardFooter>
            <Button variant="secondary" onClick={handleImportFromGoogleDrive}>Import from Google Drive</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image Library</CardTitle>
          <CardDescription>
            Images available to use across your website.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoadingImages ? (
                <div className="flex h-32 items-center justify-center">
                    <LoaderCircle className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Object.entries(images).map(([id, image]) => (
                        <div key={id} className="group relative aspect-square overflow-hidden rounded-lg">
                            <img src={image.url} alt={image.hint || 'Site image'} className="h-full w-full object-cover" />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                {replacementTargetId ? (
                                    <Button size="sm" onClick={() => setImageToReplace({id, image})}>
                                        <CheckCircle className="mr-2 h-4 w-4" /> Select
                                    </Button>
                                ) : (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => setImageToDelete({ id, storagePath: image.storagePath })}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={!!imageToDelete} onOpenChange={() => setImageToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the image. If it's being used on your site, it will no longer appear.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                   {isDeleting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                   Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
     <AlertDialog open={!!imageToReplace} onOpenChange={() => setImageToReplace(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Replacement</AlertDialogTitle>
                <AlertDialogDescription>
                    This will replace the "{replacementTargetId}" image with your selection. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmReplacement} disabled={isReplacing}>
                   {isReplacing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                   Replace Image
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
    

    

    
