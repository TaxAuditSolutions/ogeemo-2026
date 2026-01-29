
'use client';

import React, { useState } from 'react';
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
import { useSiteImages } from '@/hooks/use-site-images';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoaderCircle, Image as ImageIcon, Upload, Save, Edit, Trash2 } from 'lucide-react';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { uploadSiteImageClient, deleteSiteImageClient } from '@/services/file-service';

export function SiteImagesManager() {
  const { images, isLoading: isLoadingImages, loadImages } = useSiteImages();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for new image upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newImageId, setNewImageId] = useState('');

  // State for replacement and deletion
  const [imageToReplace, setImageToReplace] = useState<{ id: string; file: File; previewUrl: string } | null>(null);
  const [imageToDelete, setImageToDelete] = useState<{ id: string; storagePath?: string } | null>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const allImageKeys = Object.keys(images);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const handleSaveNewImage = async () => {
    if (!selectedFile || !newImageId.trim()) {
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide both an Image ID and a file.' });
        return;
    }
    
    if (images[newImageId]) {
        toast({ variant: 'destructive', title: 'ID Already Exists', description: 'Please choose a unique ID for the new image.' });
        return;
    }

    setIsProcessing(true);
    try {
        await uploadSiteImageClient(selectedFile, newImageId.trim(), 'User uploaded image');
        
        toast({ title: 'Upload Successful' });
        setSelectedFile(null);
        setPreviewUrl(null);
        setNewImageId('');
        loadImages(); // Refresh the list
        setIsProcessing(false);
    } catch (error: any) {
        console.error("Upload failed:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        setIsProcessing(false);
    }
  };

  const handleReplaceClick = (id: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setImageToReplace({ id, file, previewUrl: reader.result as string });
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleConfirmReplace = async () => {
    if (!imageToReplace || !user) return;
    
    const existingImage = images[imageToReplace.id];
    
    setIsProcessing(true);
    try {
        // Use client-side upload to overwrite/update the image for this ID
        await uploadSiteImageClient(imageToReplace.file, imageToReplace.id, existingImage?.hint || '');
        
        toast({ title: 'Image Replaced' });
        setImageToReplace(null);
        loadImages();
        setIsProcessing(false);
    } catch (error: any) {
        console.error("Replace failed:", error);
        toast({ variant: 'destructive', title: 'Replace Failed', description: error.message });
        setIsProcessing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!imageToDelete) return;
    setIsProcessing(true);
    try {
      await deleteSiteImageClient({ imageId: imageToDelete.id, storagePath: imageToDelete.storagePath });
      toast({ title: 'Image Deleted' });
      setImageToDelete(null);
      loadImages();
    } catch (error: any) {
      console.error("Delete failed:", error);
      toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingImages) {
    return (
      <div className="flex justify-center items-center py-16">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Add New Site Image</CardTitle>
                <CardDescription>Upload a new image to your library.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                 <div className="space-y-2">
                    <Label htmlFor="new-image-id">New Image ID</Label>
                    <Input id="new-image-id" placeholder="e.g., 'about-hero'" value={newImageId} onChange={(e) => setNewImageId(e.target.value)} disabled={isProcessing} />
                     <p className="text-xs text-muted-foreground">Unique ID (no spaces).</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="file-upload">Image File</Label>
                    <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} disabled={isProcessing} />
                </div>
                {previewUrl && (
                    <div className="md:col-span-2 flex flex-col items-center gap-4">
                        <div className="w-full max-w-sm aspect-video relative"><img src={previewUrl} alt="Preview" className="rounded-md object-contain w-full h-full" /></div>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveNewImage} disabled={isProcessing || !selectedFile || !newImageId.trim()}>
                    {isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isProcessing ? 'Uploading...' : 'Save New Image'}
                </Button>
            </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Image Library</CardTitle>
            <CardDescription>These are the images available for your site.</CardDescription>
          </CardHeader>
          <CardContent>
            {allImageKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No images found. Upload one to get started.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allImageKeys.map((key) => {
                    const image = images[key];
                    return (
                    <div key={key} className="space-y-2 group relative">
                        <div className="aspect-video w-full">
                            <ImagePlaceholder id={key} className="rounded-lg" />
                        </div>
                        <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => handleReplaceClick(key)}><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => setImageToDelete({ id: key, storagePath: image?.storagePath })}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <div className="text-center"><p className="text-sm font-medium">{key}</p></div>
                    </div>
                    );
                })}
                </div>
            )}
          </CardContent>
        </Card>
    </div>
    <AlertDialog open={!!imageToReplace} onOpenChange={() => setImageToReplace(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Replace Image?</AlertDialogTitle><AlertDialogDescription>Replace the image for "{imageToReplace?.id}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
             {imageToReplace?.previewUrl && (<div className="my-4 flex justify-center"><img src={imageToReplace.previewUrl} alt="Preview" className="rounded-md max-h-60 object-contain"/></div>)}
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmReplace}>{isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : null} Replace</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={!!imageToDelete} onOpenChange={() => setImageToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Image?</AlertDialogTitle><AlertDialogDescription>Permanently delete "{imageToDelete?.id}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">{isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : null} Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
