'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GitMerge } from 'lucide-react';
import { ContactInUseError, type BlockedContact } from '@/lib/contact-links';

/** The error as the contacts that are in use, or null for any other error. */
export function blockedContactsFrom(error: unknown): BlockedContact[] | null {
  return error instanceof ContactInUseError ? error.blocked : null;
}

interface ContactInUseDialogProps {
  blocked: BlockedContact[] | null;
  onClose: () => void;
  /** Starts a merge for the first blocked contact. Omit where merging is not offered. */
  onMerge?: (contactId: string) => void;
}

/**
 * Why a contact cannot be deleted: it is still named by work. Lists each contact and what uses it, and
 * offers Merge, which moves the work to another contact and then removes this one safely.
 */
export function ContactInUseDialog({ blocked, onClose, onMerge }: ContactInUseDialogProps) {
  const open = !!blocked && blocked.length > 0;
  const first = blocked?.[0];

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {blocked && blocked.length === 1 ? 'This contact cannot be deleted' : 'These contacts cannot be deleted'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Deleting a contact that work still refers to would leave that work pointing at nobody: an invoice
                with no client, a time log nobody can be billed for, a task assigned to someone who is gone.
                Nothing was deleted.
              </p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3">
                {(blocked ?? []).map((contact) => (
                  <li key={contact.id}>
                    <span className="font-semibold text-foreground">{contact.name}</span> is used by {contact.summary}.
                  </li>
                ))}
              </ul>
              <p>
                To remove {blocked && blocked.length === 1 ? 'it' : 'them'}, merge {blocked && blocked.length === 1 ? 'it' : 'each one'} into
                another contact (the work moves across and the duplicate is removed), or delete or reassign that
                work first.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          {onMerge && first && (
            <AlertDialogAction onClick={() => onMerge(first.id)}>
              <GitMerge className="mr-2 h-4 w-4" /> Merge {blocked && blocked.length > 1 ? `"${first.name}"` : 'it'} into another contact
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
