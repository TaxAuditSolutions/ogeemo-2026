'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Sparkles, Download, Wand2, X, Image as ImageIcon, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { generateImage } from '@/ai/flows/image-generation-flow';

export function ImageGeneratorView() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setGeneratedImageUrl(null);

    try {
      // Call the server action directly instead of using a fetch request
      const result = await generateImage({ prompt: prompt.trim() });
      setGeneratedImageUrl(result.imageUrl);
      toast({ title: 'Image Generated Successfully!' });
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `ogeemo-ai-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
      <header className="text-center mb-6 w-full max-w-4xl relative">
        <div className="flex items-center justify-center gap-2">
          <Wand2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold font-headline text-primary">AI Image Generator</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Harness the power of Google's Imagen model to create unique visuals for your business.
        </p>
        <div className="absolute top-0 right-0">
            <Button asChild variant="ghost" size="icon">
                <Link href="/action-manager" aria-label="Close">
                    <X className="h-5 w-5" />
                </Link>
            </Button>
        </div>
      </header>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Describe Your Vision</CardTitle>
            <CardDescription>
              Provide a detailed prompt. More specific descriptions generally yield better results.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Image Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="e.g., A professional workspace with a laptop, a notebook, and a cup of coffee, photorealistic, cinematic lighting..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
                className="resize-none"
                disabled={isGenerating}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleGenerate} 
              disabled={!prompt.trim() || isGenerating} 
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Image
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>Generated Result</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center bg-muted/30 relative min-h-[300px]">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-4 animate-in fade-in-50">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Creating your masterpiece...</p>
              </div>
            ) : generatedImageUrl ? (
              <img 
                src={generatedImageUrl} 
                alt="Generated result" 
                className="w-full h-auto object-contain rounded-md shadow-sm max-h-[400px] animate-in zoom-in-95 duration-500"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-12 w-12 opacity-20" />
                <p className="text-sm">Your image will appear here.</p>
              </div>
            )}
          </CardContent>
          {generatedImageUrl && !isGenerating && (
            <CardFooter className="bg-background pt-4 border-t">
              <Button variant="outline" onClick={handleDownload} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download Image
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
      
      <div className="max-w-4xl w-full mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="space-y-2">
              <h4 className="font-semibold flex items-center justify-center md:justify-start gap-2"><Info className="h-4 w-4 text-primary" /> Be Specific</h4>
              <p className="text-sm text-muted-foreground">Describe textures, lighting, and style (e.g., "minimalist", "bright", "macro").</p>
          </div>
          <div className="space-y-2">
              <h4 className="font-semibold flex items-center justify-center md:justify-start gap-2"><Info className="h-4 w-4 text-primary" /> Avoid Complexity</h4>
              <p className="text-sm text-muted-foreground">The AI works best with one clear subject rather than a crowded scene.</p>
          </div>
          <div className="space-y-2">
              <h4 className="font-semibold flex items-center justify-center md:justify-start gap-2"><Info className="h-4 w-4 text-primary" /> Rapid Iteration</h4>
              <p className="text-sm text-muted-foreground">If the result isn't perfect, adjust your prompt and try again!</p>
          </div>
      </div>
    </div>
  );
}
