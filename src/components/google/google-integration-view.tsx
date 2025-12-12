
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownAZ, ArrowUpZA, Save, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getUserProfile, updateUserProfile } from "@/services/user-profile-service";
import { DraggableAppButton } from "./DraggableAppButton";
import Link from "next/link";
import { allApps, type GoogleApp } from '@/lib/google-apps';


export function GoogleIntegrationView() {
    const [apps, setApps] = useState<GoogleApp[]>(allApps);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        async function loadOrder() {
            if (user) {
                const profile = await getUserProfile(user.uid);
                const savedOrder = profile?.preferences?.googleAppsOrder;
                if (savedOrder && savedOrder.length > 0) {
                    const orderedApps = savedOrder
                        .map(name => allApps.find(app => app.name === name))
                        .filter(Boolean) as GoogleApp[];
                    const remainingApps = allApps.filter(app => !savedOrder.includes(app.name));
                    setApps([...orderedApps, ...remainingApps]);
                } else {
                    setApps(allApps);
                }
            }
        }
        loadOrder();
    }, [user]);

    const handleSort = (direction: 'asc' | 'desc') => {
        setApps(prev => [...prev].sort((a, b) => {
            return direction === 'asc' 
                ? a.name.localeCompare(b.name) 
                : b.name.localeCompare(a.name);
        }));
    };
    
    const handleSaveOrder = async () => {
        if (!user) return;
        try {
            const orderToSave = apps.map(app => app.name);
            const profile = await getUserProfile(user.uid);
            await updateUserProfile(user.uid, user.email || '', {
                ...profile,
                preferences: { ...profile?.preferences, googleAppsOrder: orderToSave }
            });
            toast({ title: "App Order Saved" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        }
    };

    const moveApp = useCallback((dragIndex: number, hoverIndex: number) => {
        setApps(prev => {
            const newApps = [...prev];
            const [draggedItem] = newApps.splice(dragIndex, 1);
            newApps.splice(hoverIndex, 0, draggedItem);
            return newApps;
        });
    }, []);

    return (
        <div className="p-4 sm:p-6 flex flex-col items-center h-full">
            <div className="w-full max-w-2xl space-y-6">
                <Card>
                    <CardHeader className="text-center relative">
                        <CardTitle>Google Document Manager</CardTitle>
                        <CardDescription>
                        A hub to manage Google Drive Files & Folders
                        </CardDescription>
                         <div className="absolute top-4 right-4">
                            <Button asChild variant="ghost" size="icon">
                                <Link href="/file-manager">
                                    <X className="h-5 w-5" />
                                    <span className="sr-only">Back to Document Manager</span>
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center">
                        <div className="flex justify-center gap-2 mb-4">
                            <Button variant="outline" size="sm" onClick={() => handleSort('asc')}><ArrowDownAZ className="mr-2 h-4 w-4" /> A-Z</Button>
                            <Button variant="outline" size="sm" onClick={() => handleSort('desc')}><ArrowUpZA className="mr-2 h-4 w-4" /> Z-A</Button>
                            <Button variant="outline" size="sm" onClick={handleSaveOrder}><Save className="mr-2 h-4 w-4" /> Save Order</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {apps.map((app, index) => (
                            <DraggableAppButton key={app.name} app={app} index={index} moveApp={moveApp} />
                            ))}
                        </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="text-center">
                        <CardTitle>Instructions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                            <li>This page provides quick shortcuts to your most-used Google Workspace applications.</li>
                            <li><strong>Drag &amp; Drop:</strong> Click and hold any app button to drag it to a new position in the list.</li>
                            <li><strong>Sort:</strong> Use the "A-Z" or "Z-A" buttons to automatically sort the list alphabetically.</li>
                            <li><strong>Save Your Order:</strong> Your custom order is not saved automatically. Click the "Save Order" button to make your changes permanent.</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
