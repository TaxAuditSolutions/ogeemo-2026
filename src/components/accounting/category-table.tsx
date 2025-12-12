
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  PlusCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Info,
  GitMerge,
  FileSignature,
  ShieldAlert,
  Archive,
} from 'lucide-react';
import type { IncomeCategory, ExpenseCategory } from '@/services/accounting-service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Category = IncomeCategory | ExpenseCategory;

interface CategoryTableProps {
    title: string;
    description: string;
    categories: Category[];
    onAdd: () => void;
    onEdit: (category: Category) => void;
    onDelete: (category: Category) => void;
    onArchive: (category: Category) => void;
    onMerge: (category: Category) => void;
    onViewInfo: (category: Category) => void;
    selectedIds: string[];
    onSelectedIdsChange: (ids: string[]) => void;
    onBulkDelete: () => void;
}

export const CategoryTable: React.FC<CategoryTableProps> = ({ 
    title, 
    description, 
    categories, 
    onAdd, 
    onEdit, 
    onDelete,
    onArchive,
    onMerge, 
    onViewInfo,
    selectedIds,
    onSelectedIdsChange,
    onBulkDelete,
}) => {
    
    const isStandardCategory = (category: Category) => {
        return category.categoryNumber ? !category.categoryNumber.startsWith('C-') : false;
    };
    
    const handleToggleSelect = (id: string, isStandard: boolean) => {
        if (isStandard) return;
        onSelectedIdsChange(
            selectedIds.includes(id)
                ? selectedIds.filter(i => i !== id)
                : [...selectedIds, id]
        );
    };

    const handleToggleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked) {
            onSelectedIdsChange(categories.filter(c => !isStandardCategory(c)).map(c => c.id));
        } else {
            onSelectedIdsChange([]);
        }
    };
    
    const customCategories = categories.filter(c => !isStandardCategory(c));
    const allCustomSelected = customCategories.length > 0 && selectedIds.length === customCategories.length;
    const someCustomSelected = selectedIds.length > 0 && !allCustomSelected;

    return (
        <Card>
            <CardHeader className="flex-row items-start justify-between">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                 {selectedIds.length > 0 ? (
                    <Button variant="destructive" onClick={onBulkDelete}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedIds.length})
                    </Button>
                ) : (
                    <Button variant="outline" onClick={onAdd}><PlusCircle className="mr-2 h-4 w-4" /> Add Category</Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                  <Checkbox
                                    checked={allCustomSelected ? true : someCustomSelected ? 'indeterminate' : false}
                                    onCheckedChange={handleToggleSelectAll}
                                    disabled={customCategories.length === 0}
                                  />
                                </TableHead>
                                <TableHead>Category Name</TableHead>
                                <TableHead className="w-24">Line #</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map(category => {
                                const isStandard = isStandardCategory(category);
                                return (
                                    <TableRow key={category.id}>
                                        <TableCell>
                                          <Checkbox
                                            checked={selectedIds.includes(category.id)}
                                            onCheckedChange={() => handleToggleSelect(category.id, isStandard)}
                                            disabled={isStandard}
                                          />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <span>{category.name}</span>
                                                {isStandard && (
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger>
                                                          <ShieldAlert className="h-4 w-4 text-blue-500" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>Standard CRA category. Cannot be edited or deleted.</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{category.categoryNumber}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => onViewInfo(category)}><Info className="mr-2 h-4 w-4" />View Explanation</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => onEdit(category)} disabled={isStandard}><Pencil className="mr-2 h-4 w-4"/>Edit Name</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => onMerge(category)} disabled={isStandard}><GitMerge className="mr-2 h-4 w-4"/>Merge Category</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {isStandard ? (
                                                        <DropdownMenuItem onSelect={() => onArchive(category)}><Archive className="mr-2 h-4 w-4"/>Archive</DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onSelect={() => onDelete(category)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};
