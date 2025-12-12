
"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface GoogleImportInstructionsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProceed: (dontShowAgain: boolean) => void;
}

function GoogleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 mr-2">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.618-3.229-11.303-7.582l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.447-2.274 4.481-4.244 5.892l6.19 5.238C42.012 35.245 44 30.028 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
    )
}

export default function GoogleImportInstructionsDialog({
  isOpen,
  onOpenChange,
  onProceed,
}: GoogleImportInstructionsDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleProceedClick = () => {
    onProceed(dontShowAgain);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GoogleIcon />
            Import from Google Workspace
          </DialogTitle>
          <DialogDescription>
            Follow these simple steps to securely connect your Google account and import your contacts.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="flex items-start gap-4 p-3 border rounded-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">1</div>
                <div>
                    <h4 className="font-semibold">Proceed to Google</h4>
                    <p className="text-sm text-muted-foreground">Click the "Proceed to Google" button below. A new secure window or tab will open, taking you to Google's sign-in page.</p>
                </div>
            </div>
             <div className="flex items-start gap-4 p-3 border rounded-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">2</div>
                <div>
                    <h4 className="font-semibold">Authorize Ogeemo</h4>
                    <p className="text-sm text-muted-foreground">Sign in to your Google account if prompted. Google will ask you to grant Ogeemo permission to view your contacts. This is a read-only permission.</p>
                </div>
            </div>
             <div className="flex items-start gap-4 p-3 border rounded-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">3</div>
                <div>
                    <h4 className="font-semibold">Import Your Contacts</h4>
                    <p className="text-sm text-muted-foreground">After authorizing, you will be brought back to Ogeemo to select which contacts you'd like to import into your Contact Manager.</p>
                </div>
            </div>
        </div>
        <DialogFooter className="sm:justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
                <Checkbox id="dont-show-again" checked={dontShowAgain} onCheckedChange={(checked) => setDontShowAgain(!!checked)} />
                <Label htmlFor="dont-show-again" className="text-sm font-normal">Don't show this again</Label>
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleProceedClick}>
                    <GoogleIcon />
                    Proceed to Google
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
