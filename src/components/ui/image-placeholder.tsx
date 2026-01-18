'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import Link from 'next/link';

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
  const seedId = getSeedId(hint);
  const imageUrl = `https://picsum.photos/seed/${seedId}/600/400`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div
          className={cn(
            'relative w-full h-full bg-muted rounded-lg group cursor-pointer overflow-hidden',
            className
          )}
        >
          <Image
            src={imageUrl}
            alt={hint}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-2 bg-background/80 rounded-full">
              <Pencil className="h-5 w-5 text-foreground" />
            </div>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace This Image</DialogTitle>
          <DialogDescription>
            You can replace this placeholder image using the AI Image Generator.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm">
            This image is a placeholder based on the hint: <span className="font-semibold">"{hint}"</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            Click the button below to go to the image generator. You can use the hint as a starting point for your prompt. After you generate and download an image, let me know, and I can update the code to use your new image.
          </p>
        </div>
        <DialogFooter>
          <Button asChild>
            <Link href={`/tools/image-generator?prompt=${encodeURIComponent(hint)}`}>
              Go to Image Generator
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
