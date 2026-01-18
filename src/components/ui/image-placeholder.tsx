
'use client';

import React, { useState, useEffect } from 'react';
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
import { Pencil, Link as LinkIcon, ClipboardCopy, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { Label } from './label';
import { useToast } from '@/hooks/use-toast';
import imageData from '@/app/lib/placeholder-images.json';
import { useAuth } from '@/context/auth-context';

type ImageId = keyof typeof imageData;

interface ImagePlaceholderProps {
  id: ImageId;
  className?: string;
  'data-ai-hint'?: string;
}

export function ImagePlaceholder({ id, className, 'data-ai-hint': dataAiHint }: ImagePlaceholderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dataUri, setDataUri] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  
  const imageInfo = imageData[id];
  if (!imageInfo) {
    return <div className={cn("bg-destructive text-destructive-foreground p-2 rounded-md", className)}>Error: Image ID "{id}" not found.</div>
  }
  
  const hint = dataAiHint || imageInfo.hint;
  const { src } = imageInfo;

  const handlePrepareUpdate = () => {
    if (!dataUri.trim().startsWith('data:image')) {
      toast({
        variant: 'destructive',
        title: 'Invalid Image Data',
        description: 'Please paste a valid image from your clipboard.',
      });
      return;
    }
    
    const command = `IMAGE_REPLACE::${JSON.stringify({ id, dataUri })}`;
    navigator.clipboard.writeText(command);
    setIsCopied(true);
    toast({
        title: 'Command Copied!',
        description: 'Now paste the command into the chat to apply the change.',
    });
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    setDataUri(result);
                };
                reader.readAsDataURL(blob);
                toast({ title: 'Image Pasted!', description: 'You can now prepare the update command.' });
                return; // Exit after handling the first image
            }
        }
    }
    toast({ variant: 'destructive', title: 'Paste Error', description: 'No image data was found on the clipboard.' });
  };

  const imageElement = (
    <div
      className={cn(
        'relative w-full h-full bg-muted rounded-lg group overflow-hidden',
        user && 'cursor-pointer'
      )}
      data-ai-hint={hint}
    >
      <Image
        src={src}
        alt={hint}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        priority // Prioritize loading visible images
      />
      {user && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-2 bg-background/80 rounded-full">
            <Pencil className="h-5 w-5 text-foreground" />
          </div>
        </div>
      )}
    </div>
  );

  if (!user) {
    return imageElement;
  }

  return (
    <Dialog onOpenChange={(open) => { if (!open) { setIsCopied(false); setDataUri('')} }}>
      <DialogTrigger asChild>
        {imageElement}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Replace Placeholder Image</DialogTitle>
          <DialogDescription>
            Use the steps below to generate or find a new image and apply it to the site.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold">Step 1: Copy an Image</h4>
                <p className="text-sm text-muted-foreground">
                    Find an image on your computer or the web and copy it to your clipboard (right-click &gt; Copy Image). Or, generate a new one.
                </p>
                <Button asChild>
                    <Link href={`/tools/image-generator?prompt=${encodeURIComponent(hint)}`}>
                       <LinkIcon className="mr-2 h-4 w-4" /> Open Image Generator
                    </Link>
                </Button>
            </div>
             <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold">Step 2: Paste Your Image</h4>
                <p className="text-sm text-muted-foreground">
                   Click on the area below and paste your copied image.
                </p>
                <div
                    onPaste={handlePaste}
                    className="mt-2 w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-background cursor-pointer"
                >
                    {dataUri ? (
                        <div className="relative w-full h-full p-2">
                           <Image src={dataUri} alt="Pasted image preview" fill className="object-contain rounded-md" />
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Paste image here</p>
                    )}
                </div>
            </div>
             <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-semibold">Step 3: Prepare and Apply Update</h4>
                <p className="text-sm text-muted-foreground">
                   Click the button below to copy a command, then paste it into the AI chat to finalize the replacement.
                </p>
                <Button onClick={handlePrepareUpdate} disabled={!dataUri.trim()}>
                    {isCopied ? <ClipboardCheck className="mr-2 h-4 w-4" /> : <ClipboardCopy className="mr-2 h-4 w-4" />}
                    {isCopied ? 'Command Copied!' : 'Prepare Update Command'}
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
