'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { LoaderCircle, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useSiteImages } from '@/hooks/use-site-images';
import Image from 'next/image';
import { uploadSiteImage, deleteSiteImage } from '@/services/file-service';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ImageGeneratorPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<{ id: string; url: string } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { images, isLoading } = useSiteImages();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image file.' });
        return;
    }

    setIsUploading(true);
    try {
      await uploadSiteImage(user.uid, file);
      toast({ title: 'Upload Successful', description: `"${file.name}" has been added to your library.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
      setIsUploading(false);
      // Reset the input field to allow re-uploading the same file
      event.target.value = '';
    }
  };
  
  const handleDelete = async () => {
    if (!imageToDelete || !user) return;
    
    try {
        await deleteSiteImage(imageToDelete.id);
        toast({ title: "Image Deleted" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setImageToDelete(null);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold font-headline text-primary">Site Image Library</h1>
          <p className="text-muted-foreground">Manage the images used across your website.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Upload New Image</CardTitle>
            <CardDescription>Upload an image to make it available for use on your website.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-6 border-2 border-dashed rounded-lg">
                <Input id="image-upload" type="file" accept="image/*" onChange={handleFileChange} disabled={isUploading} className="hidden" />
                <Label htmlFor="image-upload" className="w-full">
                    <Button asChild className="w-full cursor-pointer" disabled={isUploading}>
                        <div>
                            {isUploading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {isUploading ? 'Uploading...' : 'Choose an Image'}
                        </div>
                    </Button>
                </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Image Gallery</CardTitle>
            <CardDescription>Images available to use on your website.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <LoaderCircle className="h-8 w-8 animate-spin" />
              </div>
            ) : Object.keys(images).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(images).map(([id, image]) => (
                  <Card key={id} className="group relative">
                    <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                       <Image src={image.url} alt={image.hint || 'Site image'} fill className="object-cover" />
                    </div>
                     <div className="absolute top-1 right-1">
                        <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => setImageToDelete({id, url: image.url})}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                     </div>
                     <div className="p-2 text-xs truncate border-t">
                        <p className="font-medium truncate">{image.hint || id}</p>
                     </div>
                  </Card>
                ))}
              </div>
            ) : (
                <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                    <ImageIcon className="mx-auto h-12 w-12" />
                    <p className="mt-4">Your image library is empty. Upload an image to get started.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!imageToDelete} onOpenChange={() => setImageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the image. If it's currently used on your site, it will disappear.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete Image</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
