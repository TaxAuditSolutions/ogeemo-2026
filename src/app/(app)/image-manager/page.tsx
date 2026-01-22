
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";

export default function ImageManagerPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <SettingsPageHeader pageTitle="Image Manager" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Image Manager</h1>
        <p className="text-muted-foreground">This is the new home for your site image library.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Image Library</CardTitle>
          <CardDescription>
            Functionality to upload and manage images will be added here in the next step.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
          <p>Image gallery will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
