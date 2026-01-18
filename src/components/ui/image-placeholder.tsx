'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import imageData from '@/app/lib/placeholder-images.json';
import { useAuth } from '@/context/auth-context';

type ImageId = keyof typeof imageData;

interface ImagePlaceholderProps {
  id: ImageId;
  className?: string;
  'data-ai-hint'?: string;
}

export function ImagePlaceholder({ id, className, 'data-ai-hint': dataAiHint }: ImagePlaceholderProps) {
  const { user } = useAuth();
  const imageInfo = imageData[id];
  if (!imageInfo) {
    return <div className={cn("bg-destructive text-destructive-foreground p-2 rounded-md", className)}>Error: Image ID "{id}" not found.</div>
  }
  
  const hint = dataAiHint || imageInfo.hint;
  const { src } = imageInfo;

  const imageElement = (
    <div
      className={cn(
        'relative w-full h-full bg-muted rounded-lg group overflow-hidden',
        className
      )}
      data-ai-hint={hint}
    >
      <Image
        src={src}
        alt={hint}
        fill
        className="object-cover"
        priority
      />
    </div>
  );

  return imageElement;
}
