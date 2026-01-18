'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Sparkles, Download, RefreshCw, Image as ImageIcon, ClipboardCopy, ClipboardCheck } from 'lucide-react';
import Image from 'next/image';
import { generateImage } from '@/ai/flows/image-generation-flow';
import { Textarea } from '@/components/ui/textarea';

export default function ImageGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    const promptFromUrl = searchParams.get('prompt');
    if (promptFromUrl) {
      setPrompt(decodeURIComponent(promptFromUrl));
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ variant: 'destructive', title: 'Prompt is required' });
      return;
    }
    setIsLoading(true);
    setImageUrl(null);
    try {
      const result = await generateImage({ prompt });
      setImageUrl(result.imageUrl);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Image Generation Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setImageUrl(null);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${prompt.slice(0, 20).replace(/\s/g, '_') || 'generated_image'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyDataUri = () => {
    if (!imageUrl) return;
    navigator.clipboard.writeText(imageUrl);
    setIsCopied(true);
    toast({ title: 'Copied!', description: 'Image Data URI copied to clipboard.' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
      <header className="text-center mb-6 max-w-2xl">
        <h1 className="text-3xl font-bold font-headline text-primary">AI Image Generator</h1>
        <p className="text-muted-foreground">
          Create unique images from text prompts using Google's Imagen model.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>1. Enter your prompt</CardTitle>
            <CardDescription>Describe the image you want to create in detail.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="e.g., A photorealistic image of a majestic lion wearing a crown, sitting on a throne in a jungle"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  disabled={isLoading}
                />
              </div>
              <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Generating...' : 'Generate Image'}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. Your Generated Image</CardTitle>
            <CardDescription>The generated image will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-full">
            {isLoading ? (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <LoaderCircle className="h-10 w-10 animate-spin" />
                <p>Generating your image...</p>
              </div>
            ) : imageUrl ? (
              <div className="space-y-4 w-full">
                <div className="aspect-square relative w-full bg-muted rounded-lg overflow-hidden">
                   <Image src={imageUrl} alt={prompt} fill className="object-contain" />
                </div>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={handleTryAgain}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <Button variant="secondary" onClick={handleCopyDataUri}>
                    {isCopied ? <ClipboardCheck className="mr-2 h-4 w-4" /> : <ClipboardCopy className="mr-2 h-4 w-4" />}
                    {isCopied ? 'Copied!' : 'Copy Data URI'}
                  </Button>
                  <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center pt-2">
                  To replace an image on the website, click "Copy Data URI" and paste it into the dialog on the other page.
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg w-full">
                <ImageIcon className="mx-auto h-12 w-12" />
                <p className="mt-4">Your image will be generated here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
