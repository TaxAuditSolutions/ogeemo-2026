
'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSiteImages, type SiteImage } from '@/hooks/use-site-images';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Trash2, CheckCircle, FileUp } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { uploadSiteImageClient, deleteSiteImageClient } from '@/services/file-service';

function SiteImagesManagerContent() {
    const { images, isLoading: isLoadingImages, loadImages } = useSiteImages();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [imageToDelete, setImageToDelete] = useState<{ id: string; storagePath: string } | null>(null);
    
    const replacementTargetId = searchParams.get('replace');
    const [imageToReplace, setImageToReplace] = useState<{ id: string; image: SiteImage } | null>(null);
    const [isReplacing, setIsReplacing] = useState(false);

    const handleFileUpload = async (file: File | null) => {
        if (!file) {
            toast({ variant: 'destructive', title: 'No file selected.' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ variant: 'destructive', title: 'Image too large', description: 'Please use an image smaller than 5MB.' });
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        
        reader.onerror = () => {
            toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read the image file.' });
            setIsUploading(false);
        };

        reader.onloadend = async () => {
            try {
                const dataUrl = reader.result as string;
                await uploadSiteImageClient(file.name, dataUrl, file.type);
                toast({ title: 'Upload Successful', description: `${file.name} has been added.` });
                loadImages();
            } catch (error: any) {
                console.error("Error calling uploadSiteImage cloud function:", error);
                toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
            } finally {
                setIsUploading(false);
            }
        };

        reader.readAsDataURL(file);
    };

    const handleFileSelectFromInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        handleFileUpload(file || null);
    };


    const handleDelete = async () => {
        if (!imageToDelete) return;
        
        setIsDeleting(true);
        try {
            await deleteSiteImageClient(imageToDelete.id, imageToDelete.storagePath);
            toast({ title: 'Image Deleted' });
            setImageToDelete(null);
            loadImages();
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleConfirmReplacement = async () => {
        if (!imageToReplace || !replacementTargetId) return;

        setIsReplacing(true);
        try {
            const { image } = imageToReplace;
            
            // We need to fetch the image data to upload it again under the new ID.
            const response = await fetch(image.url);
            if (!response.ok) throw new Error("Could not fetch the selected image data.");
            const blob = await response.blob();

            const reader = new FileReader();
            reader.onerror = () => { throw new Error("Could not read image data for replacement.") };
            reader.onloadend = async () => {
                const dataUrl = reader.result as string;
                 await uploadSiteImageClient(
                    image.hint || 'replacement.png',
                    dataUrl,
                    blob.type,
                    replacementTargetId
                );
                toast({
                    title: "Image Replaced",
                    description: `The '${replacementTargetId}' image has been updated successfully.`
                });
                router.push('/website'); // Go back to the website to see the change
            };
            reader.readAsDataURL(blob);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Replacement Failed', description: error.message });
            setIsReplacing(false);
            setImageToReplace(null);
        }
    };

    return (
        <>
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

export function SiteImagesManager() {
    return (
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>}>
            <SiteImagesManagerContent />
        </Suspense>
    );
}
