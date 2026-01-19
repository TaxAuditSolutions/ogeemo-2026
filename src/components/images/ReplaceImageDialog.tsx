'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoaderCircle, Check, Upload } from 'lucide-react';
import Image from 'next/image';
import { useSiteImages } from '@/hooks/use-site-images';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { updateSiteImage, uploadSiteImage } from '@/services/file-service';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '@/context/auth-context';

interface ReplaceImageDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  imageToReplaceId: string | null;
}

export function ReplaceImageDialog({ isOpen, onOpenChange, imageToReplaceId }: ReplaceImageDialogProps) {
    const { images, isLoading: isLoadingImages } = useSiteImages();
    const [selectedImage, setSelectedImage] = useState<{ id: string; url: string; hint: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen) {
            setSelectedImage(null);
        }
    }, [isOpen]);

    const handleSave = async () => {
        if (!imageToReplaceId || !selectedImage) {
            toast({ variant: 'destructive', title: 'No Image Selected', description: 'Please select a new image from the gallery.' });
            return;
        }

        setIsSaving(true);
        try {
            await updateSiteImage(imageToReplaceId, { url: selectedImage.url, hint: selectedImage.hint });
            toast({ title: 'Image Updated', description: 'The website image has been replaced.' });
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
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
            if (event.target) {
                event.target.value = '';
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Replace Image</DialogTitle>
                    <DialogDescription>Select a new image from your library, or upload a new one.</DialogDescription>
                </DialogHeader>
                <div className="flex justify-end border-b pb-4">
                    <Input id="image-upload-input" type="file" className="hidden" onChange={handleFileChange} disabled={isUploading} accept="image/*" />
                    <Button asChild>
                        <Label htmlFor="image-upload-input" className="cursor-pointer">
                            {isUploading ? (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="mr-2 h-4 w-4" />
                            )}
                            {isUploading ? 'Uploading...' : 'Upload New Image'}
                        </Label>
                    </Button>
                </div>
                <ScrollArea className="h-96 my-4">
                    {isLoadingImages ? (
                        <div className="flex items-center justify-center h-full"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
                            {Object.entries(images).map(([id, image]) => (
                                <Card
                                    key={id}
                                    onClick={() => setSelectedImage({ id, ...image })}
                                    className={cn("cursor-pointer hover:shadow-lg transition-shadow", selectedImage?.id === id && "ring-2 ring-primary")}
                                >
                                    <CardContent className="p-0 aspect-square relative">
                                        <Image src={image.url} alt={image.hint || 'Site image'} fill className="object-cover rounded-t-lg" />
                                        {selectedImage?.id === id && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Check className="h-10 w-10 text-white" />
                                            </div>
                                        )}
                                    </CardContent>
                                    <div className="p-2 border-t text-xs truncate">
                                        <p className="font-medium">{image.hint || id}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!selectedImage || isSaving}>
                        {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Save & Replace
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
