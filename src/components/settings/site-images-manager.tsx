
'use client';

import React, { useState } from 'react';
import { useSiteImages } from '@/hooks/use-site-images';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoaderCircle, Image as ImageIcon, Upload, Save } from 'lucide-react';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import imageData from '@/app/lib/placeholder-images.json';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { uploadSiteImage } from '@/services/file-service';

type ImageId = keyof typeof imageData;

export function SiteImagesManager() {
  const { images, isLoading: isLoadingImages, loadImages } = useSiteImages();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newImageId, setNewImageId] = useState('');
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  const allImageKeys = Object.keys(imageData) as (keyof typeof imageData)[];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSaveNewImage = async () => {
    if (!selectedFile || !newImageId.trim() || !user) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please select a file and provide a unique ID for the new image.',
        });
        return;
    }
    
    if (allImageKeys.includes(newImageId as any) || images[newImageId]) {
        toast({
            variant: 'destructive',
            title: 'ID Already Exists',
            description: 'This ID is already in use. Please choose a unique one.',
        });
        return;
    }

    setIsUploading(true);
    try {
        await uploadSiteImage({
            userId: user.uid,
            file: selectedFile,
            imageId: newImageId.trim(),
            hint: 'User uploaded image',
        });
        toast({ title: 'Upload Successful', description: `Image "${newImageId.trim()}" has been added.` });
        
        // Reset form and reload images
        setSelectedFile(null);
        setPreviewUrl(null);
        setNewImageId('');
        loadImages(); // This will trigger a re-fetch of the images from Firestore

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
        setIsUploading(false);
    }
  };


  if (isLoadingImages) {
    return (
      <div className="flex justify-center items-center py-16">
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Add New Site Image</CardTitle>
                <CardDescription>
                Upload a new image to your library. It will then be available to use throughout your site.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                 <div className="space-y-2">
                    <Label htmlFor="new-image-id">New Image ID</Label>
                    <Input 
                        id="new-image-id"
                        placeholder="e.g., 'about-page-hero'"
                        value={newImageId}
                        onChange={(e) => setNewImageId(e.target.value)}
                        disabled={isUploading}
                    />
                     <p className="text-xs text-muted-foreground">A unique, descriptive ID (e.g., 'contact-hero'). No spaces or special characters.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="file-upload">Image File</Label>
                    <Input 
                        id="file-upload" 
                        type="file" 
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                </div>
                {previewUrl && (
                    <div className="md:col-span-2 flex flex-col items-center gap-4">
                        <p className="text-sm font-medium">Image Preview:</p>
                        <div className="w-full max-w-sm aspect-video relative">
                            <img src={previewUrl} alt="Preview of selected file" className="rounded-md object-contain w-full h-full" />
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveNewImage} disabled={isUploading || !selectedFile || !newImageId.trim()}>
                    {isUploading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isUploading ? 'Uploading...' : 'Save New Image'}
                </Button>
            </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Image Library</CardTitle>
            <CardDescription>
              These are the images currently available for your site.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allImageKeys.map((key) => {
                const imageInfo = images[key];
                return (
                  <div key={key} className="space-y-2">
                    <div className="aspect-video w-full">
                      <ImagePlaceholder id={key} className="rounded-lg h-full w-full" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{key}</p>
                      <p className="text-xs text-muted-foreground">{imageData[key]?.hint || ''}</p>
                    </div>
                  </div>
                );
              })}
              {/* Display user-uploaded images */}
              {Object.keys(images)
                .filter(key => !allImageKeys.includes(key as any))
                .map(key => (
                  <div key={key} className="space-y-2">
                    <div className="aspect-video w-full">
                      <ImagePlaceholder id={key as ImageId} className="rounded-lg h-full w-full" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{key}</p>
                       <p className="text-xs text-muted-foreground">{images[key]?.hint || 'User uploaded'}</p>
                    </div>
                  </div>
              ))}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
