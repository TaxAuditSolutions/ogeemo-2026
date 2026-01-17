
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
             <p className="text-sm text-muted-foreground">
              Welcome to Ogeemo! Before creating your account, please take a moment to review our legal terms. By checking the box below and proceeding, you acknowledge that you have read, understood, and agree to be bound by our full <Link href="/terms" target="_blank" className="text-primary underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              These documents govern your use of the Ogeemo platform and outline our commitments to you, and yours to us.
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
