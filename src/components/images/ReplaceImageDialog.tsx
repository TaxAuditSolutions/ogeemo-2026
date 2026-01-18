'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { doc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface ReplaceImageDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  imageId: string;
  currentSrc: string;
  onImageUpdated: () => void;
}

export function ReplaceImageDialog({ isOpen, onOpenChange, imageId, currentSrc, onImageUpdated }: ReplaceImageDialogProps) {
  const [newUrl, setNewUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewError, setIsPreviewError] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();

  useEffect(() => {
    if (isOpen) {
      setNewUrl(''); // Reset on open
      setIsPreviewError(false);
    }
  }, [isOpen]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewUrl(e.target.value);
    setIsPreviewError(false); // Reset error when URL changes
  };

  const handleSave = async () => {
    if (!db) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
        return;
    }
    if (!newUrl.trim() || isPreviewError) {
      toast({ variant: 'destructive', title: 'Invalid Image URL', description: 'Please enter a valid, direct link to an image.' });
      return;
    }
    
    setIsSaving(true);
    try {
        const imageDocRef = doc(db, 'siteImages', imageId);
        await setDoc(imageDocRef, { url: newUrl, hint: imageId }, { merge: true });
        
        toast({ title: 'Image Updated!', description: 'Your new image should now be visible.' });
        onImageUpdated();
        onOpenChange(false);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace Image by URL</DialogTitle>
          <DialogDescription>
            Find an image online, copy its direct link, and paste it below to update the image.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="aspect-video w-full relative bg-muted rounded-md overflow-hidden">
                <Image 
                    src={newUrl || currentSrc} 
                    alt="Image preview" 
                    fill 
                    className="object-contain"
                    onError={() => {
                        if(newUrl) { // Only show error for new URLs
                            setIsPreviewError(true);
                        }
                    }}
                    key={newUrl || currentSrc} // Force re-render on URL change
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="image-url">New Image URL</Label>
                <Input
                    id="image-url"
                    placeholder="https://example.com/new_image.jpg"
                    value={newUrl}
                    onChange={handleUrlChange}
                    disabled={isSaving}
                />
                {isPreviewError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <p>This URL does not appear to be a valid image link.</p>
                    </div>
                )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !newUrl.trim() || isPreviewError}>
            {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Save Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
