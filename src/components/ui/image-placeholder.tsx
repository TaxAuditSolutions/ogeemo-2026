
'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSiteImages } from '@/hooks/use-site-images';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { uploadSiteImageClient, updateSiteImageLink } from '@/core/file-service';
import { LoaderCircle, Image as ImageIcon, ClipboardPaste, Upload, Edit, Check } from 'lucide-react';

interface ImagePlaceholderProps {
  id: string;
  className?: string;
}

export function ImagePlaceholder({ id, className }: ImagePlaceholderProps) {
  const { images, isLoading: isLoadingImages, loadImages } = useSiteImages();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedImage, setPastedImage] = useState<{ file: File; previewUrl: string } | null>(null);
  
  // New state for Library Dialog
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [selectedLibraryImageId, setSelectedLibraryImageId] = useState<string | null>(null);


  const handlePasteFromClipboard = useCallback(async () => {
    setIsLibraryOpen(false); 
    if (!navigator.clipboard?.read) {
      toast({
        variant: 'destructive',
        title: 'Paste Not Supported',
        description: 'Your browser does not support pasting from the clipboard.',
      });
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      const imageItem = clipboardItems.find(item => item.types.some(type => type.startsWith('image/')));
      
      if (!imageItem) {
        toast({
          variant: 'destructive',
          title: 'No Image Found',
          description: 'No image was found on the clipboard. Try right-clicking an image and selecting "Copy Image", then try pasting again.',
        });
        return;
      }
      
      const imageType = imageItem.types.find(type => type.startsWith('image/'))!;
      const blob = await imageItem.getType(imageType);
      const file = new File([blob], `pasted-image.${imageType.split('/')[1]}`, { type: imageType });

      const reader = new FileReader();
      reader.onloadend = () => {
        setPastedImage({ file, previewUrl: reader.result as string });
      };
      reader.readAsDataURL(file);

    } catch (error: any) {
      console.error('Clipboard paste error:', error);
      toast({
        variant: 'destructive',
        title: 'Paste Failed',
        description: error.message || 'Could not read image from clipboard. You may need to grant clipboard permissions to the site.',
      });
    }
  }, [toast]);
  
  const handleUploadFromComputer = useCallback(() => {
    setIsLibraryOpen(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPastedImage({ file, previewUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
  }, []);

  const handleConfirmReplace = useCallback(async () => {
    if (!pastedImage || !user) return;
    
    setIsProcessing(true);
    try {
        // Use client-side upload instead of cloud function to avoid payload limits and cold starts
        await uploadSiteImageClient(pastedImage.file, id, '');
        
        toast({ title: 'Image Uploaded', description: `A new image has been uploaded for "${id}".` });
        loadImages();
    } catch (error: any) {
        console.error("Upload failed:", error);
        toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    } finally {
        setIsProcessing(false);
        setPastedImage(null);
    }
  }, [pastedImage, user, id, toast, loadImages]);

  const handleLibrarySelect = async () => {
      if (!selectedLibraryImageId || !user) return;
      
      const selectedImage = images[selectedLibraryImageId];
      if (!selectedImage) {
          toast({ variant: 'destructive', title: 'Error', description: 'Selected image not found.' });
          return;
      }

      setIsProcessing(true);
      try {
          await updateSiteImageLink(id, selectedImage);
          toast({ title: 'Image Linked', description: `This placeholder now uses the image from "${selectedLibraryImageId}".` });
          setIsLibraryOpen(false);
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
      } finally {
          setIsProcessing(false);
      }
  };


  const firestoreImage = images[id];
  const src = firestoreImage?.url;
  const hint = firestoreImage?.hint;

  const content = () => {
    if (isLoadingImages) {
        return (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <LoaderCircle className="h-6 w-6 animate-spin text-white" />
            </div>
        );
    }
    if (src) {
        return (
            <Image
                src={src}
                alt={hint || 'Site image'}
                fill
                className="object-contain"
                priority
                key={src}
            />
        );
    }
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-muted/50 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <p className="text-xs mt-2 text-center">No image set for '{id}'</p>
        </div>
    );
  };

  return (
    <>
      <div className={cn('relative w-full h-full bg-muted rounded-lg overflow-hidden group', className)} data-ai-hint={hint}>
        {content()}
        {user && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={() => {
                  setSelectedLibraryImageId(null);
                  setIsLibraryOpen(true);
              }}
              title="Replace image"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
         {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                <LoaderCircle className="h-8 w-8 animate-spin text-white" />
            </div>
        )}
      </div>

      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-4 py-3 border-b shrink-0">
                <DialogTitle>Select Image</DialogTitle>
                <DialogDescription className="hidden sm:block">
                    Choose an image from the library or upload a new one.
                </DialogDescription>
            </DialogHeader>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b shrink-0">
                <Button variant="outline" size="sm" onClick={handlePasteFromClipboard} className="h-8">
                    <ClipboardPaste className="mr-2 h-3.5 w-3.5" />
                    Paste from Clipboard
                </Button>
                <Button variant="outline" size="sm" onClick={handleUploadFromComputer} className="h-8">
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Upload
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                    {Object.entries(images).map(([key, img]) => (
                        <div 
                            key={key} 
                            className={cn(
                                "group relative aspect-video cursor-pointer rounded-lg border-2 overflow-hidden transition-all",
                                selectedLibraryImageId === key ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-primary/50"
                            )}
                            onClick={() => setSelectedLibraryImageId(key)}
                        >
                            <Image src={img.url} alt={img.hint} fill className="object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded truncate max-w-[90%]">{key}</span>
                            </div>
                            {selectedLibraryImageId === key && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-sm">
                                    <Check className="h-3 w-3" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <DialogFooter className="px-4 py-3 border-t bg-muted/10 shrink-0">
                <Button variant="outline" onClick={() => setIsLibraryOpen(false)} size="sm">Cancel</Button>
                <Button onClick={handleLibrarySelect} disabled={!selectedLibraryImageId || isProcessing} size="sm">
                    {isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Select Image
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pastedImage} onOpenChange={() => setPastedImage(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Upload</AlertDialogTitle>
                <AlertDialogDescription>
                    Do you want to upload this image to "{id}"? This will overwrite the current content if it is not linked to another image.
                </AlertDialogDescription>
            </AlertDialogHeader>
            {pastedImage?.previewUrl && (
                <div className="my-4 flex justify-center">
                    <img src={pastedImage.previewUrl} alt="Pasted preview" className="rounded-md max-h-60 object-contain"/>
                </div>
            )}
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmReplace}>Upload & Replace</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
