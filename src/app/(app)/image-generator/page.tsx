
'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, WandSparkles, Upload, Save } from 'lucide-react';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import ImageSaveDialog from '@/components/image-generator/image-save-dialog';

export default function ImageGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [importedImageFile, setImportedImageFile] = useState<File | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const previewUrl = generatedImageUrl || (importedImageFile ? URL.createObjectURL(importedImageFile) : null);
  const isImageReady = !!previewUrl;

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({
        variant: 'destructive',
        title: 'Prompt is required',
        description: 'Please describe the image you want to create.',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedImageUrl(null);
    setImportedImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const response = await fetch('/api/genkit/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'The API returned an error.');
      }

      const result = await response.json();
      setGeneratedImageUrl(result.imageUrl);
      toast({
        title: 'Image Generated Successfully',
      });
    } catch (error: any) {
      console.error("Image generation failed:", error);
      toast({
        variant: 'destructive',
        title: 'Image Generation Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please select an image file smaller than 4MB.',
        });
        return;
      }
      setImportedImageFile(file);
      setGeneratedImageUrl(null);
      setPrompt('');
    }
  };
  
  const convertFileToDataUrl = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  }, []);

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold font-headline text-primary">AI Image Generation</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Create or import images to use in your application.
          </p>
        </header>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <Card>
            <CardHeader>
              <CardTitle>1. Create or Import</CardTitle>
              <CardDescription>
                Describe the image you want to create, or import an existing one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="e.g., A photorealistic image of a majestic lion in the African savanna at sunset"
                rows={8}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
              />
              <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              <Button variant="outline" onClick={handleImportClick} className="w-full"><Upload className="mr-2 h-4 w-4" /> Import Image</Button>
            </CardContent>
            <CardFooter>
              <Button onClick={handleGenerateImage} disabled={isLoading || !prompt.trim()} className="w-full">
                {isLoading ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <WandSparkles className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Generating...' : 'Generate Image'}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Preview & Save</CardTitle>
              <CardDescription>
                Your generated or imported image will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt={prompt || importedImageFile?.name || 'Preview'}
                    width={600}
                    height={400}
                    className="rounded-lg object-contain h-full w-full"
                    unoptimized={!!importedImageFile} // Necessary for blob URLs
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Waiting for prompt or import...</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
                <Button onClick={() => setIsSaveDialogOpen(true)} disabled={!isImageReady} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Save to File Manager
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      {isImageReady && (
        <ImageSaveDialog
            isOpen={isSaveDialogOpen}
            onOpenChange={setIsSaveDialogOpen}
            imageDataUrl={previewUrl}
            defaultFileName={importedImageFile?.name || 'generated-image.png'}
            convertFileToDataUrl={importedImageFile ? () => convertFileToDataUrl(importedImageFile) : undefined}
        />
      )}
    </>
  );
}
