
'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSiteImages } from '@/hooks/use-site-images';
import { useAuth } from '@/context/auth-context';
import { LoaderCircle, Image as ImageIcon } from 'lucide-react';

interface ImagePlaceholderProps {
  id: string;
  className?: string;
}

export function ImagePlaceholder({ id, className }: ImagePlaceholderProps) {
  const { images, isLoading: isLoadingImages } = useSiteImages();
  const { user } = useAuth();

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
                key={src} // Force re-render if src changes
            />
        );
    }
    // If no image is found in Firestore, show a generic placeholder.
    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-muted/50 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <p className="text-xs mt-2 text-center">No image set for '{id}'</p>
        </div>
    );
  };

  return (
      <div
        className={cn(
          'relative w-full h-full bg-muted rounded-lg overflow-hidden group',
          className
        )}
        data-ai-hint={hint}
      >
        {content()}
      </div>
  );
}
