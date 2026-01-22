
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { FileUp } from "lucide-react";

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
          <CardTitle>Add New Image</CardTitle>
          <CardDescription>
            Paste an image into the area below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <FileUp className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Paste an image here
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 5MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image Library</CardTitle>
          <CardDescription>
            The image gallery will be displayed here in a future step.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-48 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
          <p>Image gallery will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
