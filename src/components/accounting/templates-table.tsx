'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Copy, FileText, MoreHorizontal, Pencil, PenLine, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface StoredTemplate {
  id?: string;
  name: string;
  items: { description: string; quantity: number; price: number }[];
  notes?: string;
}

/** Legacy localStorage templates have no id; assign stable ids in memory (persisted on first mutation). */
export function ensureTemplateIds(templates: any[], salt = 'tpl'): StoredTemplate[] {
  return (Array.isArray(templates) ? templates : []).map((t, i) =>
    t && t.id ? t : { ...t, id: `${salt}_${i}_${Date.now()}` }
  );
}

const generateTemplateId = () => `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const formatCurrency = (amount: number) =>
  amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const templateValue = (t: StoredTemplate) =>
  (t.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);

interface TemplatesTableProps {
  templates: StoredTemplate[];
  onTemplatesChange: (next: StoredTemplate[]) => void;
  storageKey: string;
  onUse: (template: StoredTemplate) => void;
  createHref: string;
  /** 'Invoice' | 'Quote' — drives action labels. */
  entityLabel: string;
  emptyHint: string;
}

/**
 * One-row-per-template list for the invoice/quote templates pages.
 * Row click loads the template into the generator; the actions menu offers
 * Use / Duplicate / Rename / Delete. Persists to localStorage on every mutation.
 */
export function TemplatesTable({
  templates,
  onTemplatesChange,
  storageKey,
  onUse,
  createHref,
  entityLabel,
  emptyHint,
}: TemplatesTableProps) {
  const [search, setSearch] = useState('');
  const [templateToDelete, setTemplateToDelete] = useState<StoredTemplate | null>(null);
  const { toast } = useToast();

  const commit = (next: StoredTemplate[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (error) {
      console.error('Failed to persist templates:', error);
    }
    onTemplatesChange(next);
  };

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = query
      ? templates.filter(
          (t) =>
            (t.name || '').toLowerCase().includes(query) ||
            (t.items || []).some((item) => (item.description || '').toLowerCase().includes(query))
        )
      : [...templates];
    return matches.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [templates, search]);

  const templateId = (t: StoredTemplate) => t.id || t.name;

  const handleDuplicate = (template: StoredTemplate) => {
    let name = `${template.name} (copy)`;
    let attempt = 1;
    while (templates.some((t) => t.name === name)) {
      attempt += 1;
      name = `${template.name} (copy ${attempt})`;
    }
    const duplicate: StoredTemplate = { ...template, id: generateTemplateId(), name };
    commit([duplicate, ...templates]);
    toast({ title: 'Template Duplicated', description: `"${name}" has been created.` });
  };

  const handleRename = (template: StoredTemplate) => {
    const nextName = window.prompt('Rename template:', template.name);
    if (!nextName || !nextName.trim() || nextName.trim() === template.name) return;
    const trimmed = nextName.trim();
    if (templates.some((t) => templateId(t) !== templateId(template) && t.name === trimmed)) {
      toast({
        variant: 'destructive',
        title: 'Name Already Used',
        description: `A template named "${trimmed}" already exists.`,
      });
      return;
    }
    commit(templates.map((t) => (templateId(t) === templateId(template) ? { ...t, name: trimmed } : t)));
    toast({ title: 'Template Renamed', description: `Renamed to "${trimmed}".` });
  };

  const handleConfirmDelete = () => {
    if (!templateToDelete) return;
    commit(templates.filter((t) => templateId(t) !== templateId(templateToDelete)));
    toast({
      title: 'Template Deleted',
      description: `The "${templateToDelete.name}" template has been removed.`,
    });
    setTemplateToDelete(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="h-9 pl-8"
          />
        </div>
        <Button asChild>
          <Link href={createHref}>
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed py-16 text-center text-muted-foreground">
          <FileText className="mx-auto h-12 w-12" />
          <p className="mt-4">{emptyHint}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead className="hidden w-[80px] text-right sm:table-cell">Items</TableHead>
                <TableHead className="hidden w-[140px] text-right sm:table-cell">Value</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => (
                  <TableRow
                    key={templateId(template)}
                    className="group cursor-pointer"
                    title={`Open template in ${entityLabel} generator`}
                    onClick={() => onUse(template)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{template.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                      {(template.items || []).length}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono sm:table-cell">
                      {formatCurrency(templateValue(template))}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onUse(template)}>
                            <Pencil className="mr-2 h-4 w-4" /> Use in {entityLabel}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRename(template)}>
                            <PenLine className="mr-2 h-4 w-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setTemplateToDelete(template)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center italic text-muted-foreground">
                    No templates match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => { if (!open) setTemplateToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {`"${templateToDelete?.name}"`}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
