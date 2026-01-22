'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, Unsubscribe } from 'firebase/firestore';
import { getFirebaseServices } from '@/firebase';
import { useToast } from './use-toast';

export interface SiteImage {
    url: string;
    hint: string;
    storagePath: string; // Add storagePath to the interface
}

export function useSiteImages() {
    const [images, setImages] = useState<Record<string, SiteImage>>({});
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const services = getFirebaseServices();

    const loadImages = useCallback(() => {
        if (!services) {
            setIsLoading(false);
            return () => {}; // Return a no-op function if services are not available
        }

        setIsLoading(true);
        const { db } = services;
        const q = query(collection(db, 'siteImages'));
        
        const unsubscribe = onSnapshot(q, 
            (querySnapshot) => {
                const imagesData: Record<string, SiteImage> = {};
                querySnapshot.forEach((doc) => {
                    imagesData[doc.id] = doc.data() as SiteImage;
                });
                setImages(imagesData);
                setIsLoading(false);
            },
            (error) => {
                console.error("Error listening to site images:", error);
                toast({ variant: 'destructive', title: 'Live Update Error', description: 'Could not sync site images.' });
                setIsLoading(false);
            }
        );
        return unsubscribe;

    }, [services, toast]);

    useEffect(() => {
        const unsubscribe = loadImages();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [loadImages]);
    
    return { images, isLoading, loadImages };
}
