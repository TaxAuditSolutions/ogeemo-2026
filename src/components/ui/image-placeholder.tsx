'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import imageData from '@/app/lib/placeholder-images.json';
import { useAuth } from '@/context/auth-context';
import { useSiteImages } from '@/hooks/use-site-images';
import { Pencil, LoaderCircle } from 'lucide-react';
import { ReplaceImageDialog } from '@/components/images/ReplaceImageDialog';

type ImageId = keyof typeof imageData;

interface ImagePlaceholderProps {
  id: ImageId;
  className?: string;
  'data-ai-hint'?: string;
}

export function ImagePlaceholder({ id, className, 'data-ai-hint': dataAiHint }: ImagePlaceholderProps) {
  const { user } = useAuth();
  const { images, isLoading } = useSiteImages();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  const handleImageUpdate = () => {
    // The useSiteImages hook will automatically update the view thanks to onSnapshot.
  };

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
        {user && (
            <button
                onClick={() => setIsDialogOpen(true)}
                className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                aria-label={`Replace image for ${id}`}
            >
                <Pencil className="h-4 w-4" />
            </button>
        )}
        {isLoading && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <LoaderCircle className="h-6 w-6 animate-spin text-white" />
            </div>
        )}
      </div>
      <ReplaceImageDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        imageId={id}
        currentSrc={src}
        onImageUpdated={handleImageUpdate}
      />
    </>
  );
}
