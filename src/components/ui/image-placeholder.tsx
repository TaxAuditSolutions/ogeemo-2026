
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSiteImages } from '@/hooks/use-site-images';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { uploadSiteImage, replaceSiteImage } from '@/services/file-service';
import { LoaderCircle, Image as ImageIcon, ClipboardPaste, Upload, Edit } from 'lucide-react';

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
  const [isReplaceChoiceDialogOpen, setIsReplaceChoiceDialogOpen] = useState(false);


  const handlePasteFromClipboard = useCallback(async () => {
    setIsReplaceChoiceDialogOpen(false); // Close choice dialog
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
    setIsReplaceChoiceDialogOpen(false); // Close choice dialog
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
        const existingImage = images[id];

        if (!existingImage || !existingImage.storagePath) {
            // This is an old image record. Perform an upload instead of a replace to fix it.
            await uploadSiteImage({
                fileDataUrl: pastedImage.previewUrl,
                fileName: pastedImage.file.name,
                imageId: id,
                hint: existingImage?.hint || ''
            });
            toast({ title: 'Image Uploaded', description: `A new image has been uploaded for "${id}".` });
        } else {
            // This is a normal replacement for a modern image record.
            await replaceSiteImage({
                fileDataUrl: pastedImage.previewUrl,
                fileName: pastedImage.file.name,
                imageId: id,
                storagePathToOverwrite: existingImage.storagePath,
            });
            toast({ title: 'Image Replaced', description: `The image for "${id}" has been updated.` });
        }
        
        loadImages();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    } finally {
        setIsProcessing(false);
        setPastedImage(null);
    }
  }, [pastedImage, user, images, id, toast, loadImages]);

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
              onClick={() => setIsReplaceChoiceDialogOpen(true)}
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

      <AlertDialog open={isReplaceChoiceDialogOpen} onOpenChange={setIsReplaceChoiceDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>How would you like to replace this image?</AlertDialogTitle>
                <AlertDialogDescription>
                    You can paste an image from your clipboard or upload a new file from your computer.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                <Button variant="outline" onClick={handlePasteFromClipboard}>
                    <ClipboardPaste className="mr-2 h-4 w-4" />
                    Paste from Clipboard
                </Button>
                <Button variant="outline" onClick={handleUploadFromComputer}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload from Computer
                </Button>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pastedImage} onOpenChange={() => setPastedImage(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Replacement</AlertDialogTitle>
                <AlertDialogDescription>
                    Do you want to replace the image for "{id}" with the image below? This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            {pastedImage?.previewUrl && (
                <div className="my-4 flex justify-center">
                    <img src={pastedImage.previewUrl} alt="Pasted preview" className="rounded-md max-h-60 object-contain"/>
                </div>
            )}
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmReplace}>Replace</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
