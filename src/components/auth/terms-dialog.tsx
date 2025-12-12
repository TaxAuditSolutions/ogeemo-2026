
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
import { ScrollArea } from '../ui/scroll-area';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface TermsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export const TermsDialog = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: TermsDialogProps) => {
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Terms & Conditions
          </DialogTitle>
          <DialogDescription>
            Please review and accept the terms before proceeding.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-48 w-full rounded-md border p-4">
            <h4 className="font-bold mb-2">Beta Program Disclaimer of Liability</h4>
            <p className="text-sm text-muted-foreground space-y-2">
              This Beta Program is provided "as is" without warranty of any kind, express or implied. By participating, you acknowledge that Ogeemo and its affiliates shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including but not limited to, damages for loss of profits, goodwill, use, data, or other intangible losses (even if Ogeemo has been advised of the possibility of such damages), resulting from the use or the inability to use the service.
              <br/><br/>
              You agree to indemnify and hold harmless Ogeemo, its contractors, and its licensors, and their respective directors, officers, employees, and agents from and against any and all claims and expenses, including attorneys’ fees, arising out of your use of the application, including but not limited to your violation of this Agreement.
            </p>
          </ScrollArea>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="terms" 
            checked={isTermsAccepted}
            onCheckedChange={(checked) => setIsTermsAccepted(!!checked)}
          />
          <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            I have read and agree to the <Link href="/terms" target="_blank" className="underline">Terms and Conditions</Link>.
          </Label>
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={!isTermsAccepted || isSubmitting}
            onClick={onConfirm}
            className="w-full"
          >
            {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
