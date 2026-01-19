'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import imageData from '@/app/lib/placeholder-images.json';
import { useSiteImages } from '@/hooks/use-site-images';
import { useAuth } from '@/context/auth-context';
import { LoaderCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReplaceImageDialog } from '@/components/images/ReplaceImageDialog';

type ImageId = keyof typeof imageData;

interface ImagePlaceholderProps {
  id: ImageId;
  className?: string;
  'data-ai-hint'?: string;
}

export function ImagePlaceholder({ id, className, 'data-ai-hint': dataAiHint }: ImagePlaceholderProps) {
  const { images, isLoading: isLoadingImages } = useSiteImages();
  const { user } = useAuth();
  
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false);

  const placeholderInfo = imageData[id];
  const firestoreImage = images[id];

  const src = firestoreImage?.url || placeholderInfo?.src;
  const hint = dataAiHint || firestoreImage?.hint || placeholderInfo?.hint;
  
  if (!src) {
      return (
          <div className={cn("bg-destructive text-destructive-foreground p-2 rounded-md flex items-center justify-center", className)}>
              <p>Error: Image source for "{id}" not found.</p>
          </div>
      );
  }

  return (
    <>
      <div
        className={cn(
          'relative w-full h-full bg-muted rounded-lg group overflow-hidden',
          className
        )}
        data-ai-hint={hint}
      >
        <Image
          src={src}
          alt={hint || 'Placeholder image'}
          fill
          className="object-cover"
          priority
          key={src}
        />
        {isLoadingImages && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <LoaderCircle className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
        {user && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" className="h-8 w-8" onClick={() => setIsReplaceDialogOpen(true)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Replace image</span>
            </Button>
          </div>
        )}
      </div>
      {user && (
        <ReplaceImageDialog 
          isOpen={isReplaceDialogOpen}
          onOpenChange={setIsReplaceDialogOpen}
          imageToReplaceId={id}
        />
      )}
    </>
  );
}
