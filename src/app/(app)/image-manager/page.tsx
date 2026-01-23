
'use client';

import { SettingsPageHeader } from "@/components/settings/settings-page-header";

export default function ImageManagerPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <SettingsPageHeader pageTitle="Image Manager" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Image Manager</h1>
        <p className="text-muted-foreground">Manage your site-wide images for heroes, logos, and more.</p>
      </header>
      {/* Content has been removed to start fresh */}
    </div>
  );
}
