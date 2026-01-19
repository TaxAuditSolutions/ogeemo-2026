
'use client';

import React, { useState } from 'react';
import { useSiteImages } from '@/hooks/use-site-images';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoaderCircle, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { httpsCallable } from 'firebase/functions';
import { useFirebase } from '@/firebase';

export function SiteImagesManager() {
    const { images, isLoading: isLoadingImages, loadImages } = useSiteImages();
    const { functions } = useFirebase();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [imageToDelete, setImageToDelete] = useState<{ id: string; storagePath: string } | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!functions) {
            toast({ variant: 'destructive', title: 'Error', description: 'Firebase Functions not initialized.' });
            return;
        }

        setIsUploading(true);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64File = reader.result as string;
            try {
                const uploadSiteImage = httpsCallable(functions, 'uploadSiteImage');
                await uploadSiteImage({
                    fileName: file.name,
                    fileBuffer: base64File,
                });
                toast({ title: 'Upload Successful', description: `${file.name} has been added to your library.` });
                loadImages(); // Force reload
            } catch (error: any) {
                console.error("Upload error:", error);
                toast({ variant: 'destructive', title: 'Upload Failed', description: error.details || error.message });
            } finally {
                setIsUploading(false);
            }
        };
        reader.onerror = (error) => {
            console.error("File reader error:", error);
            toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read the selected file.' });
            setIsUploading(false);
        };
    };

    const handleDelete = async () => {
        if (!imageToDelete || !functions) return;
        setIsDeleting(true);
        try {
            const deleteSiteImage = httpsCallable(functions, 'deleteSiteImage');
            await deleteSiteImage({ imageId: imageToDelete.id, storagePath: imageToDelete.storagePath });
            toast({ title: 'Image Deleted' });
            setImageToDelete(null);
            loadImages();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Delete Failed', description: error.details || error.message });
        } finally {
            setIsDeleting(false);
        }
    };


    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Upload New Image</CardTitle>
                    <CardDescription>Upload a new image to your site's media library.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="picture" className="sr-only">Picture</Label>
                        <Input id="picture" type="file" onChange={handleFileChange} disabled={isUploading} accept="image/*" />
                        <Button onClick={() => document.getElementById('picture')?.click()} disabled={isUploading}>
                            {isUploading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </Button>
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
