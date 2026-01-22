'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { FileUp, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function ImageManagerPage() {
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({
              variant: 'destructive',
              title: 'Image too large',
              description: 'Please paste an image smaller than 5MB.',
            });
            return;
          }
          setPastedImage(file);
          setPreviewUrl(URL.createObjectURL(file));
          break;
        }
      }
    }
  };

  const clearPastedImage = () => {
    setPastedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };


  return (
    <div className="p-4 sm:p-6 space-y-6">
      <SettingsPageHeader pageTitle="Image Manager" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Image Manager</h1>
        <p className="text-muted-foreground">This is the new home for your site image library.</p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Image</CardTitle>
          <CardDescription>
            Paste an image into the area below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            onPaste={handlePaste}
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 relative"
            tabIndex={0}
          >
            {previewUrl ? (
                <>
                    <img src={previewUrl} alt="Pasted preview" className="max-h-full max-w-full object-contain rounded-md" />
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-background/50 hover:bg-background/80" onClick={clearPastedImage}>
                        <X className="h-4 w-4" />
                    </Button>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileUp className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    Paste an image here
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 5MB</p>
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image Library</CardTitle>
          <CardDescription>
            The image gallery will be displayed here in a future step.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
          <p>Image gallery will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
