'use client';

import * as React from 'react';
import { useDrop } from 'react-dnd';
import { format } from 'date-fns';
import { LoaderCircle, RotateCcw, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { deleteTrashedTasks, getTrashedTasks, restoreTrashedTask } from '@/services/trash-service';
import { type Event as TaskEvent } from '@/types/calendar-types';
import { type TrashedTask } from '@/lib/task-trash';
import { cn } from '@/lib/utils';

/** The bin on the To-Do List: drop a card on it to trash the task, or click it to open the trash. */
export function TrashBin({ count, onDropTask, onOpen }: { count: number; onDropTask: (task: TaskEvent) => void; onOpen: () => void }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'task',
    drop: (item: TaskEvent) => {
      if (item?.id) onDropTask(item);
    },
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  }), [onDropTask]);

  return (
    <button
      type="button"
      ref={(node) => { drop(node); }}
      onClick={onOpen}
      aria-label={count > 0 ? `Open the trash (${count} ${count === 1 ? 'item' : 'items'})` : 'Open the trash (empty)'}
      className={cn(
        'flex items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors',
        isOver && canDrop ? 'border-destructive bg-destructive/10 text-destructive' : canDrop ? 'border-muted-foreground/60' : 'hover:border-muted-foreground/60',
      )}
    >
      <Trash2 className="h-4 w-4" />
      <span>{canDrop ? 'Drop here to trash' : 'Trash'}</span>
      {count > 0 && !canDrop && <span className="rounded-full bg-muted px-2 text-xs font-medium text-foreground">{count}</span>}
    </button>
  );
}

const STATUS_LABEL: Record<TrashedTask['status'], string> = { todo: 'To Do', inProgress: 'In Progress', done: 'Done' };

type Confirm = { ids: string[]; label: string };

/** One row of the trash: the task, a Restore button, and a delete-for-good button. */
function TrashRow({ item, busy, anyBusy, onRestore, onDelete }: {
  item: TrashedTask;
  busy: boolean;
  anyBusy: boolean;
  onRestore: (item: TrashedTask) => void;
  onDelete: (confirm: Confirm) => void;
}) {
  return (
    <li className="flex items-center gap-2 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {STATUS_LABEL[item.status]}{item.trashedAt ? ` · trashed ${format(item.trashedAt, 'PP p')}` : ''}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={anyBusy} onClick={() => onRestore(item)}>
        {busy ? <LoaderCircle className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1 h-3.5 w-3.5" />} Restore
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        aria-label={`Delete "${item.title}" for good`}
        disabled={anyBusy}
        onClick={() => onDelete({ ids: [item.id], label: `"${item.title}"` })}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

/** What is in the trash: restore an item, delete one for good, or empty the trash. */
export function TrashDialog({ open, onOpenChange, onChanged }: { open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<TrashedTask[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<Confirm | null>(null);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      setItems(await getTrashedTasks());
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not open the trash', description: error?.message || 'Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const handleRestore = async (item: TrashedTask) => {
    setBusyId(item.id);
    try {
      const { title, notes } = await restoreTrashedTask(item.id);
      toast({ title: 'Restored', description: notes.length ? `"${title}" is back; ${notes.join('; ')}.` : `"${title}" is back on your list.` });
      await load();
      onChanged();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not restore it', description: error?.message || 'Please try again.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteForever = async () => {
    if (!confirm) return;
    try {
      const removed = await deleteTrashedTasks(confirm.ids);
      toast({ title: removed === 1 ? 'Deleted for good' : `${removed} items deleted for good` });
      await load();
      onChanged();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not delete', description: error?.message || 'Please try again.' });
    } finally {
      setConfirm(null);
    }
  };

  const emptyLabel = `all ${items.length} ${items.length === 1 ? 'item' : 'items'} in the trash`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Trash</DialogTitle>
            <DialogDescription>Items you move to the trash stay here until you restore them or delete them for good.</DialogDescription>
          </DialogHeader>
          {isLoading && items.length === 0 ? (
            <div className="flex justify-center py-8"><LoaderCircle className="h-6 w-6 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">The trash is empty.</p>
          ) : (
            <ScrollArea className="max-h-80 rounded-md border">
              <ul className="divide-y">
                {items.map((item) => (
                  <TrashRow key={item.id} item={item} busy={busyId === item.id} anyBusy={busyId !== null} onRestore={handleRestore} onDelete={setConfirm} />
                ))}
              </ul>
            </ScrollArea>
          )}
          {items.length > 0 && (
            <div className="flex justify-end">
              <Button type="button" variant="destructive" size="sm" onClick={() => setConfirm({ ids: items.map((i) => i.id), label: emptyLabel })}>
                <Trash2 className="mr-2 h-4 w-4" /> Empty trash
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(next) => { if (!next) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete for good?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes {confirm?.label}. It cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteForever} className="bg-destructive hover:bg-destructive/90">Delete for good</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
