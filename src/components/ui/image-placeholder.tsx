
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { UploadCloud, Save, X } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from './button';
import ImageSaveDialog from '@/components/image-generator/image-save-dialog';
import { getImageUrlForHint } from '@/services/image-placeholder-service';
import { SITE_IMAGES_FOLDER_ID } from '@/services/file-service';
import { Skeleton } from './skeleton';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface ImagePlaceholderProps {
  'data-ai-hint': string;
  className?: string;
}

export function ImagePlaceholder({ 'data-ai-hint': hint, className }: ImagePlaceholderProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const loadInitialImage = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = await getImageUrlForHint(hint);
      setImageUrl(url);
    } catch (error) {
      console.error(`Failed to load image for hint "${hint}":`, error);
    } finally {
      setIsLoading(false);
    }
  }, [hint]);

  useEffect(() => {
    loadInitialImage();
  }, [loadInitialImage]);

  const processFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
        if (file) toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please paste or select an image file.' });
        return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processFile(event.target.files?.[0] || null);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    processFile(event.clipboardData.files[0] || null);
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSaveSuccess = () => {
    handleCancel();
    loadInitialImage();
  };

  const convertFileToDataUrl = useCallback(async (): Promise<string> => {
    if (!selectedFile) throw new Error("No file selected to convert.");
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
    });
  }, [selectedFile]);

  useEffect(() => {
    const currentPreviewUrl = previewUrl;
    return () => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [previewUrl]);
  
  const revealVariants = {
    hidden: { clipPath: 'inset(0 0 100% 0)' },
    visible: { clipPath: 'inset(0 0 0% 0)' },
  };

  if (isLoading) {
    return <Skeleton className={cn("w-full h-48 bg-muted rounded-lg", className)} />;
  }

  if (previewUrl && selectedFile) {
    return (
        <>
            <div className={cn("relative w-full h-full group", className)}>
                <Image
                    src={previewUrl}
                    alt={`Preview for ${hint}`}
                    fill
                    className="rounded-lg object-cover"
                    unoptimized
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button onClick={() => setIsSaveDialogOpen(true)} className="pointer-events-auto">
                        <Save className="mr-2 h-4 w-4" />
                        Save
                    </Button>
                    <Button variant="secondary" onClick={handleCancel} className="pointer-events-auto">
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                    </Button>
                </div>
            </div>
            {isSaveDialogOpen && (
                <ImageSaveDialog
                    isOpen={isSaveDialogOpen}
                    onOpenChange={setIsSaveDialogOpen}
                    imageDataUrl={previewUrl}
                    defaultFileName={selectedFile.name}
                    convertFileToDataUrl={convertFileToDataUrl}
                    onSaveSuccess={onSaveSuccess}
                    preselectedFolderId={SITE_IMAGES_FOLDER_ID}
                    hint={hint}
                />
            )}
        </>
    );
  }

  if (imageUrl) {
    return (
      <div className={cn("relative w-full h-full group", className)} onPaste={user ? handlePaste : undefined}>
        <motion.div
            className="w-full h-full"
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.8, ease: "easeInOut" }}
            variants={revealVariants}
        >
            <Image
              src={imageUrl}
              alt={hint}
              fill
              className="rounded-lg object-cover"
            />
        </motion.div>
        {user && (
          <>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
                <p className="text-white font-semibold">Change Image</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={user ? () => fileInputRef.current?.click() : undefined}
      onPaste={user ? handlePaste : undefined}
      className={cn(
        "w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors",
        user && "cursor-pointer hover:border-primary hover:bg-muted/50",
        className
      )}
    >
      <UploadCloud className="h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">
        {user ? 'Upload or Paste Image Here' : 'Image Placeholder'}
      </p>
      <p className="text-xs text-muted-foreground">({hint})</p>
      {user && (
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
      )}
    </div>
  );
}
