
'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImagePlaceholderProps {
  'data-ai-hint': string;
  className?: string;
}

// Simple hash function to get a consistent seed from the hint
const getSeedId = (hint: string): number => {
    let hash = 0;
    if (hint.length === 0) return hash;
    for (let i = 0; i < hint.length; i++) {
        const char = hint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

export function ImagePlaceholder({ 'data-ai-hint': hint, className }: ImagePlaceholderProps) {
  // Using picsum.photos as a fast, client-side placeholder solution
  // This avoids the slow server-side call that was causing issues.
  const seedId = getSeedId(hint);
  const imageUrl = `https://picsum.photos/seed/${seedId}/600/400`;

  return (
    <div className={cn("relative w-full h-full bg-muted rounded-lg", className)}>
        <Image
          src={imageUrl}
          alt={hint}
          fill
          className="rounded-lg object-cover"
        />
    </div>
  );
}
