
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSiteImages, type SiteImage } from '@/hooks/use-site-images';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Trash2, FileUp } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { uploadSiteImage, deleteSiteImage } from '@/services/file-service';
import { useAuth } from '@/context/auth-context';

export default function ImageManagerPage() {
    const { images, isLoading: isLoadingImages, loadImages } = useSiteImages();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [imageToDelete, setImageToDelete] = useState<{ id: string; storagePath: string } | null>(null);

    const handleFileUpload = async (file: File | null) => {
        if (!file || !user) {
            toast({ variant: 'destructive', title: 'No file selected or not logged in.' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ variant: 'destructive', title: 'Image too large', description: 'Please use an image smaller than 5MB.' });
            return;
        }

        setIsUploading(true);
        try {
            // This service function calls our secure Cloud Function
            await uploadSiteImage(file, user.uid);
            toast({ title: 'Upload Successful', description: `${file.name} has been added.` });
            loadImages();
        } catch (error: any) {
            console.error("Error uploading site image:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelectFromInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        handleFileUpload(file || null);
    };

    const handleDelete = async () => {
        if (!imageToDelete) return;
        
        setIsDeleting(true);
        try {
            // This service function calls our secure Cloud Function
            await deleteSiteImage(imageToDelete.id, imageToDelete.storagePath);
            toast({ title: 'Image Deleted' });
            setImageToDelete(null);
            loadImages();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6">
                <header className="text-center">
                    <h1 className="text-3xl font-bold font-headline text-primary">Image Manager</h1>
                    <p className="text-muted-foreground">Upload, manage, and delete your site images.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Add New Image</CardTitle>
                        <CardDescription>Choose a file from your computer to upload.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
                            onClick={() => document.getElementById('file-upload-input')?.click()}
                        >
                           {isUploading ? (
                               <div className="flex flex-col items-center gap-2">
                                   <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                                   <p className="text-sm text-muted-foreground">Uploading...</p>
                               </div>
                           ) : (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <FileUp className="w-10 h-10 mb-3 text-gray-400" />
                                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span></p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 5MB</p>
                                </div>
                           )}
                           <input id="file-upload-input" type="file" className="hidden" accept="image/png, image/jpeg, image/gif" onChange={handleFileSelectFromInput} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Image Library</CardTitle>
                        <CardDescription>Images available for use.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingImages ? (
                            <div className="flex h-32 items-center justify-center">
                                <LoaderCircle className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {Object.keys(images).length > 0 ? (
                                    Object.entries(images).map(([id, image]) => (
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
                                    ))
                                ) : (
                                    <p className="col-span-full text-center text-muted-foreground py-8">No images found in your library.</p>
                                )}
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
                            This will permanently delete the image. If it's being used anywhere, it will no longer appear.
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
