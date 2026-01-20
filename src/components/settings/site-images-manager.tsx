
'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSiteImages, type SiteImage } from '@/hooks/use-site-images';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, Trash2, Image as ImageIcon, Copy, CheckCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { uploadSiteImageClient, deleteSiteImageClient } from '@/services/file-service';

export function SiteImagesManager() {
    const { images, isLoading: isLoadingImages, loadImages } = useSiteImages();
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReplacing, setIsReplacing] = useState(false);
    
    const [imageToDelete, setImageToDelete] = useState<{ id: string; storagePath: string } | null>(null);
    const [imageToReplaceWith, setImageToReplaceWith] = useState<{ id: string; image: SiteImage } | null>(null);
    
    const replacementTargetId = searchParams.get('replace');

    const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
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
        const reader = new FileReader();
        
        reader.onerror = () => {
            toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not read the image file from clipboard.' });
            setIsUploading(false);
        };

        reader.onloadend = async () => {
            try {
                const dataUrl = reader.result as string;

                if (dataUrl.length > 5 * 1024 * 1024) { // 5MB limit for cloud function
                    toast({ variant: 'destructive', title: 'Image too large', description: 'Please use an image smaller than 5MB.' });
                    setIsUploading(false);
                    return;
                }
                
                // Call the service function which invokes the Cloud Function
                await uploadSiteImageClient(imageFile!.name, dataUrl, imageFile!.type);

                toast({ title: 'Upload Successful', description: `${imageFile!.name} has been added.` });
                loadImages();
            } catch (error: any) {
                console.error("Error calling uploadSiteImage cloud function:", error);
                toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
            } finally {
                setIsUploading(false);
            }
        };

        reader.readAsDataURL(imageFile);
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
        if (!imageToReplaceWith || !replacementTargetId) return;

        setIsReplacing(true);
        try {
            // Re-use the upload function logic, but tell it which document to replace.
            const { image } = imageToReplaceWith;
            await uploadSiteImageClient(
                image.hint || 'replacement.png', // fileName
                image.url, // fileBuffer (as dataURL or existing storage URL)
                'image/png', // contentType
                replacementTargetId // Pass the ID of the document to replace
            );

            toast({
                title: "Image Replaced",
                description: `The '${replacementTargetId}' image has been updated.`
            });
            router.push('/website');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Replacement Failed', description: error.message });
        } finally {
            setIsReplacing(false);
            setImageToReplaceWith(null);
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
                        <Button variant="outline" onClick={() => router.push('/website')}>Cancel Replacement</Button>
                    </CardFooter>
                </Card>
            )}
            
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
                                        {replacementTargetId ? (
                                            <Button size="sm" onClick={() => setImageToReplaceWith({id, image})}>
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

            <AlertDialog open={!!imageToReplaceWith} onOpenChange={() => setImageToReplaceWith(null)}>
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
    )
}
