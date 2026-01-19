
'use client';

import React, { useState } from 'react';
import { useSiteImages, type SiteImage } from '@/hooks/use-site-images';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Trash2, Image as ImageIcon, Copy } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useAuth } from '@/context/auth-context';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { uploadSiteImageClientSide, deleteSiteImageClientSide } from '@/services/file-service';

export function SiteImagesManager() {
    const { images, isLoading: isLoadingImages, loadImages } = useSiteImages();
    const { db } = useFirebase();
    const { user } = useAuth();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [imageToDelete, setImageToDelete] = useState<{ id: string; storagePath: string } | null>(null);

    const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
        if (!user || !db) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        const items = event.clipboardData.items;
        let imageFile: File | null = null;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                imageFile = items[i].getAsFile();
                break;
            }
        }

        if (!imageFile) {
            toast({ variant: 'destructive', title: 'Paste Error', description: 'No image found on the clipboard.' });
            return;
        }
        
        setIsUploading(true);
        try {
            const { url, storagePath } = await uploadSiteImageClientSide(user.uid, imageFile);
            
            const hint = imageFile.name.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
            const docId = `${Date.now()}-${hint.replace(/\s+/g, '-')}`;

            await setDoc(doc(db, 'siteImages', docId), {
                url,
                storagePath,
                hint,
                uploadedBy: user.uid,
                createdAt: new Date(),
            });

            toast({ title: 'Upload Successful', description: `${imageFile.name} has been added.` });
            loadImages(); // Refresh the image list
        } catch (error: any) {
            console.error("Client-side upload error:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!imageToDelete || !db) return;
        
        setIsDeleting(true);
        try {
            await deleteSiteImageClientSide(imageToDelete.storagePath);
            await deleteDoc(doc(db, 'siteImages', imageToDelete.id));
            
            toast({ title: 'Image Deleted' });
            setImageToDelete(null);
            loadImages(); // Refresh the list
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };


    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Add New Image</CardTitle>
                    <CardDescription>Paste an image directly into the area below to upload it.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div 
                        onPaste={handlePaste}
                        className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
                        tabIndex={0}
                    >
                       {isUploading ? (
                           <div className="flex flex-col items-center gap-2">
                               <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                               <p className="text-sm text-muted-foreground">Uploading...</p>
                           </div>
                       ) : (
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Copy className="w-10 h-10 mb-3 text-gray-400" />
                                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to focus, then paste</span></p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">(Ctrl+V or Cmd+V)</p>
                            </div>
                       )}
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Image Library</CardTitle>
                    <CardDescription>Images available to use across your website.</CardDescription>
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
    )
}
