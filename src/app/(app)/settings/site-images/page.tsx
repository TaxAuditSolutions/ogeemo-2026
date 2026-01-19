
'use client';

import { SiteImagesManager } from '@/components/settings/site-images-manager';
import { SettingsPageHeader } from '@/components/settings/settings-page-header';

export default function SiteImagesPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
        <SettingsPageHeader pageTitle="Site Images" />
        <SiteImagesManager />
    </div>
  );
}
