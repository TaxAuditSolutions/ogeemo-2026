'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import imageData from '@/app/lib/placeholder-images.json';
import { useSiteImages } from '@/hooks/use-site-images';
import { LoaderCircle } from 'lucide-react';

type ImageId = keyof typeof imageData;

interface ImagePlaceholderProps {
  id: ImageId;
  className?: string;
  'data-ai-hint'?: string;
}

export function ImagePlaceholder({ id, className, 'data-ai-hint': dataAiHint }: ImagePlaceholderProps) {
  const { images, isLoading } = useSiteImages();

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
      {isLoading && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <LoaderCircle className="h-6 w-6 animate-spin text-white" />
          </div>
      )}
    </div>
  );
}
