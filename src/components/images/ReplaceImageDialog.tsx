
'use client';

import React, { useState, useRef } from 'react';
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
import { LoaderCircle, Upload } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { useFirebase } from '@/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateSiteImageUrl } from '@/app/actions/image-actions';


interface ReplaceImageDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  imageId: string;
  currentSrc: string;
  onImageUpdated: () => void;
}

export function ReplaceImageDialog({ isOpen, onOpenChange, imageId, currentSrc, onImageUpdated }: ReplaceImageDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { storage } = useFirebase();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please select an image smaller than 4MB.',
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !user || !storage) {
        toast({ variant: 'destructive', title: 'Error', description: 'File, user, or storage service not available.' });
        return;
    }
    
    setIsUploading(true);
    
    try {
        const fileExtension = selectedFile.name.split('.').pop() || 'jpg';
        const path = `site-images/${imageId}.${fileExtension}`;
        const fileStorageRef = storageRef(storage, path);
        
        await uploadBytes(fileStorageRef, selectedFile);
        const downloadURL = await getDownloadURL(fileStorageRef);
        
        await updateSiteImageUrl(imageId, downloadURL);
        
        toast({ title: 'Image Replaced', description: 'The new image is now live.' });
        onImageUpdated();
        onOpenChange(false);

    } catch (error: any) {
        console.error("Upload error in dialog:", error);
        toast({ variant: 'destructive', title: 'Upload failed', description: error.message || "An unknown error occurred during upload." });
    } finally {
        setIsUploading(false);
    }
  };

  const resetState = () => {
      setSelectedFile(null);
      if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) resetState(); onOpenChange(open); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Replace Image</DialogTitle>
          <DialogDescription>
            Upload a new image to replace the current one. Recommended size is similar to the original. Max 4MB.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="aspect-video w-full relative bg-muted rounded-md overflow-hidden">
                <Image src={previewUrl || currentSrc} alt="Image preview" fill className="object-contain" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="image-upload">New Image File</Label>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                    </Button>
                    <Input
                        ref={fileInputRef}
                        id="image-upload"
                        type="file"
                        accept="image/png, image/jpeg, image/gif, image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    {selectedFile && <p className="text-sm text-muted-foreground self-center truncate">{selectedFile.name}</p>}
                </div>
            </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Save & Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
