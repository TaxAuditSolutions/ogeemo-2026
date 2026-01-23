
'use client';

import { Suspense } from 'react';
import { SiteImagesManager } from '@/components/settings/site-images-manager';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';
import { LoaderCircle } from 'lucide-react';

export default function ImageManagerPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <SettingsPageHeader pageTitle="Image Manager" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Image Manager</h1>
        <p className="text-muted-foreground">Manage your site-wide images for heroes, logos, and more.</p>
      </header>
      <Suspense fallback={<div className="flex h-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>}>
        <SiteImagesManager />
      </Suspense>
    </div>
  );
}
