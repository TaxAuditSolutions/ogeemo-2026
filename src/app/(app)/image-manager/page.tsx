'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { FileUp, X, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { uploadSiteImage, deleteSiteImage } from '@/services/file-service';
import { useSiteImages } from '@/hooks/use-site-images';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ImageManagerPage() {
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{ id: string; storagePath: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const { images, isLoading: isLoadingImages, loadImages } = useSiteImages();
  
  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        variant: 'destructive',
        title: 'Image too large',
        description: 'Please use an image smaller than 5MB.',
      });
      return;
    }
    setPastedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };
  
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleFileUpload(file);
          break;
        }
      }
    }
  };

  const handleFileSelectFromInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFileUpload(file || null);
    // Reset the input value to allow uploading the same file again
    event.target.value = '';
  };


  const clearPastedImage = () => {
    setPastedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };
  
  const handleSaveImage = async () => {
    if (!pastedImage || !user) {
        toast({ variant: 'destructive', title: 'No image to save or not logged in.'});
        return;
    }

    setIsUploading(true);
    try {
        await uploadSiteImage(pastedImage, user.uid);
        toast({ title: 'Image Saved', description: `${pastedImage.name} has been added to your library.` });
        clearPastedImage();
        loadImages(); // Refresh the library view
    } catch (error: any) {
        console.error("Error saving image:", error);
        const description = error.details ? `${error.message} Details: ${JSON.stringify(error.details)}` : error.message;
        toast({ variant: 'destructive', title: 'Save Failed', description });
    } finally {
        setIsUploading(false);
    }
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
         const description = error.details ? `${error.message} Details: ${JSON.stringify(error.details)}` : error.message;
         toast({ variant: 'destructive', title: 'Delete Failed', description });
    } finally {
        setIsDeleting(false);
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
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Image</CardTitle>
          <CardDescription>
            Paste an image into the area below or click to upload a file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            onPaste={handlePaste}
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 relative"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
                <>
                    <img src={previewUrl} alt="Pasted preview" className="max-h-full max-w-full object-contain rounded-md" />
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-background/50 hover:bg-background/80" onClick={(e) => { e.stopPropagation(); clearPastedImage(); }}>
                        <X className="h-4 w-4" />
                    </Button>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isUploading ? (
                      <>
                        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground mt-2">Uploading...</p>
                      </>
                  ) : (
                      <>
                        <FileUp className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or paste an image
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 5MB</p>
                      </>
                  )}
                </div>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleFileSelectFromInput} />
          </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveImage} disabled={!pastedImage || isUploading}>
                {isUploading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isUploading ? 'Saving...' : 'Save Image'}
            </Button>
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
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => setImageToDelete({ id, storagePath: image.storagePath })}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
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
    </>
  );
}
