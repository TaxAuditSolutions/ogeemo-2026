
'use client';

import React from 'react';
import { useSiteImages } from '@/hooks/use-site-images';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, Image as ImageIcon } from 'lucide-react';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import imageData from '@/app/lib/placeholder-images.json';

export function SiteImagesManager() {
  const { images, isLoading } = useSiteImages();
  
  const allImageKeys = Object.keys(imageData) as (keyof typeof imageData)[];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Image Library</CardTitle>
        <CardDescription>
          These are the images used throughout your website. Click an image to replace it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allImageKeys.map((key) => {
            const imageInfo = images[key];
            const placeholderInfo = imageData[key];

            return (
              <div key={key} className="space-y-2">
                <div className="aspect-video w-full">
                  <ImagePlaceholder id={key} className="rounded-lg h-full w-full" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{key}</p>
                  <p className="text-xs text-muted-foreground">{placeholderInfo.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
