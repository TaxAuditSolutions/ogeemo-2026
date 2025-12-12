
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, ArrowLeft, Trash2, Undo } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  getTrashedActionChips,
  restoreActionChips,
  deleteActionChips,
  type ActionChipData,
} from '@/services/project-service';
import { ActionChip } from './ActionChip';

export function TrashView() {
  const [trashedChips, setTrashedChips] = React.useState<ActionChipData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTrashedChips = React.useCallback(async () => {
    if (user) {
      setIsLoading(true);
      try {
        const chips = await getTrashedActionChips(user.uid);
        setTrashedChips(chips);
      } catch (error) {
        console.error("Failed to load trashed chips:", error);
        toast({
          variant: 'destructive',
          title: 'Failed to load trash',
          description: error instanceof Error ? error.message : 'An unknown error occurred.',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    loadTrashedChips();
  }, [loadTrashedChips]);
  
  const handleRestoreAll = async () => {
    if (!user || trashedChips.length === 0) return;
    try {
        await restoreActionChips(user.uid, trashedChips);
        toast({ title: "All Items Restored", description: "All items have been moved back to 'Available Actions'."});
        setTrashedChips([]);
        // Notify other components that chips have been updated
        window.dispatchEvent(new Event('chipsUpdated'));
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Restore Failed', description: error.message });
    }
  };
  
  const handleDeleteContents = async () => {
    if (!user || trashedChips.length === 0) return;
    if (!window.confirm("Are you sure you want to permanently delete all items in the trash? This action cannot be undone.")) return;
    
    try {
        await deleteActionChips(user.uid, trashedChips.map(c => c.id));
        toast({ title: "Trash Emptied", description: "All trashed items have been permanently deleted."});
        setTrashedChips([]);
        // Notify other components that chips have been updated
        window.dispatchEvent(new Event('chipsUpdated'));
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    }
  };

  const handlePermanentDeleteChip = async (chipToDelete: ActionChipData) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${chipToDelete.label}"? This action cannot be undone.`)) return;

    try {
      await deleteActionChips(user.uid, [chipToDelete.id]);
      toast({ title: 'Action Deleted', description: `"${chipToDelete.label}" has been permanently deleted.` });
      loadTrashedChips(); // Refresh the list
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <header className="flex items-center justify-between">
            <div className="text-center flex-1">
                <h1 className="text-3xl font-bold font-headline text-primary">Trash</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Manage items you've moved to the trash.
                </p>
            </div>
            <Button asChild variant="outline">
                <Link href="/action-manager/manage"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Manage Dashboard</Link>
            </Button>
        </header>

        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Trashed Items</CardTitle>
                <CardDescription>
                    These items have been removed from your dashboard. You can restore them or permanently delete them.
                </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px]">
                {trashedChips.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-4 border rounded-lg">
                        {trashedChips.map((chip, index) => (
                            <ActionChip key={chip.id} chip={chip} index={index} onDelete={() => handlePermanentDeleteChip(chip)} />
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>Trash is empty.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="justify-end gap-2">
                 <Button variant="outline" onClick={handleRestoreAll} disabled={trashedChips.length === 0}>
                    <Undo className="mr-2 h-4 w-4" /> Restore All
                </Button>
                <Button variant="destructive" onClick={handleDeleteContents} disabled={trashedChips.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Contents
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
