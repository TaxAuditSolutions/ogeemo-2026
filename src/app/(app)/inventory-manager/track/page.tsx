
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle } from 'lucide-react';

export default function TrackInventoryPage() {
    return (
        <>
            <div className="p-4 sm:p-6 space-y-6">
                <header className="relative text-center">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2">
                        <Button asChild variant="outline">
                            <Link href="/inventory-manager">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Inventory Hub
                            </Link>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-bold font-headline text-primary">Inventory Central</h1>
                    <p className="text-muted-foreground">Manage your items and view their complete transaction history.</p>
                </header>
                
                <div className="text-center p-4 text-2xl font-bold">
                    <Button asChild size="lg">
                        <Link href="/inventory-manager/item">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add/Update Item Stock
                        </Link>
                    </Button>
                </div>
            </div>
        </>
    );
}
