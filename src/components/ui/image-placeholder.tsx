'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, UploadCloud, ClipboardCopy, ClipboardCheck, LoaderCircle } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageInfo = imageData[id];
  if (!imageInfo) {
    return <div className={cn("bg-destructive text-destructive-foreground p-2 rounded-md", className)}>Error: Image ID "{id}" not found.</div>
  }
  
  const hint = dataAiHint || imageInfo.hint;
  const { src } = imageInfo;
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
          toast({
              variant: 'destructive',
              title: 'File Too Large',
              description: 'Please select an image file under 4MB.',
          });
          return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setDataUri(result);
        setIsCopied(false); // Reset copy state if a new image is selected
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrepareUpdate = async () => {
    if (!dataUri.trim().startsWith('data:image')) {
      toast({
        variant: 'destructive',
        title: 'No Image Selected',
        description: 'Please upload an image first.',
      });
      return;
    }
    
    setIsUploading(true);
    try {
        const fileName = `${id}-${Date.now()}.png`; // Standardize to png for simplicity
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUri, fileName }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload image.');
        }

        const { publicUrl } = await response.json();
        const command = `IMAGE_REPLACE::${JSON.stringify({ id, publicUrl })}`;
        navigator.clipboard.writeText(command);
        setIsCopied(true);
        toast({
            title: 'Command Copied!',
            description: 'Now paste the command into the chat to apply the change.',
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: `Could not upload the image: ${error.message}`,
        });
    } finally {
        setIsUploading(false);
    }
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
        priority
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Replace Image</DialogTitle>
          <DialogDescription>
            Upload a new image to replace the placeholder.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                accept="image/png, image/jpeg, image/gif, image/webp"
            />
            <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Select Image from Device
            </Button>
            
            {dataUri && (
                <div className="space-y-2">
                    <p className="text-sm font-medium">Preview:</p>
                    <div className="relative w-full aspect-video border rounded-md bg-muted flex items-center justify-center">
                        <Image src={dataUri} alt="Uploaded preview" fill className="object-contain rounded-md p-1" />
                    </div>
                </div>
            )}
        </div>
        <div className="space-y-2">
            <Button onClick={handlePrepareUpdate} disabled={!dataUri || isUploading} className="w-full">
                {isUploading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : isCopied ? <ClipboardCheck className="mr-2 h-4 w-4" /> : <ClipboardCopy className="mr-2 h-4 w-4" />}
                {isUploading ? 'Uploading...' : isCopied ? 'Command Copied!' : 'Prepare Update Command'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
                This will copy a command to your clipboard. Paste it into the chat to apply the change.
            </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
