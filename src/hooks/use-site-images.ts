
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useToast } from './use-toast';

export interface SiteImage {
    url: string;
    hint: string;
}

export function useSiteImages() {
    const [images, setImages] = useState<Record<string, SiteImage>>({});
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const setupListener = async () => {
            try {
                const { db } = await initializeFirebase();
                if (!db) {
                    setIsLoading(false);
                    return;
                }
                const q = collection(db, 'siteImages');
                unsubscribe = onSnapshot(q, 
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
            } catch (error) {
                console.error("Error setting up site images listener:", error);
                setIsLoading(false);
            }
        };

        setupListener();

        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [toast]);
    
    return { images, isLoading };
}
