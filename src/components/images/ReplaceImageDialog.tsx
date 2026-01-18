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
import { LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import { updateSiteImageUrl } from '@/app/actions/image-actions';

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
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setNewUrl(''); // Reset on open
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!newUrl.trim()) {
      toast({ variant: 'destructive', title: 'URL is required.' });
      return;
    }
    
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
        toast({ variant: 'destructive', title: 'Invalid URL', description: 'Please enter a full URL starting with http:// or https://' });
        return;
    }

    setIsSaving(true);
    try {
        const result = await updateSiteImageUrl(imageId, newUrl);
        if (result.success) {
            toast({ title: 'Image Updated!', description: 'Your new image should now be visible.' });
            onImageUpdated();
            onOpenChange(false);
        } else {
            throw new Error(result.error || 'An unknown error occurred.');
        }
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
            Find an image online, copy its URL, and paste it below to update the image.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="aspect-video w-full relative bg-muted rounded-md overflow-hidden">
                <Image src={newUrl || currentSrc} alt="Image preview" fill className="object-contain" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="image-url">New Image URL</Label>
                <Input
                    id="image-url"
                    placeholder="https://example.com/new_image.jpg"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    disabled={isSaving}
                />
            </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !newUrl.trim()}>
            {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Save Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
