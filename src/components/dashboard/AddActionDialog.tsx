
"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { addActionChip, updateActionChip } from '@/services/project-service';
import { allMenuItems } from '@/lib/menu-items';
import accountingMenuItems from '@/data/accounting-menu-items';
import type { ActionChipData } from '@/types/calendar';
import { Wand2 } from 'lucide-react';

const addActionSchema = z.discriminatedUnion("linkType", [
  z.object({
    linkType: z.literal("internal"),
    label: z.string().min(1, { message: "Label is required." }),
    targetPage: z.string({ required_error: "Please select a page." }).min(1, "Please select a page."),
    customUrl: z.string().optional(),
  }),
  z.object({
    linkType: z.literal("custom"),
    label: z.string().min(1, { message: "Label is required." }),
    targetPage: z.string().optional(),
    customUrl: z.string().min(1, { message: "URL or path is required." }).refine(
        (value) => value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://'),
        { message: "Please enter a valid URL (e.g., https://...) or an internal path (e.g., /dashboard)." }
    ),
  }),
]);

type AddActionFormData = z.infer<typeof addActionSchema>;

interface AddActionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onActionAdded: (action: ActionChipData) => void;
  onActionEdited: (action: ActionChipData) => void;
  chipToEdit: ActionChipData | null;
  existingChips: ActionChipData[];
  menuType?: 'dashboard' | 'accounting';
}

export default function AddActionDialog({ isOpen, onOpenChange, onActionAdded, onActionEdited, chipToEdit, existingChips, menuType = 'dashboard' }: AddActionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<AddActionFormData>({
    resolver: zodResolver(addActionSchema),
    defaultValues: {
      linkType: 'internal',
      label: "",
      targetPage: undefined,
      customUrl: "",
    },
  });

  const linkType = form.watch("linkType");

  const availableMenuItems = useMemo(() => {
    const sourceList = menuType === 'accounting' ? accountingMenuItems : allMenuItems;
    return sourceList.sort((a, b) => a.label.localeCompare(b.label));
  }, [menuType]);

  useEffect(() => {
    if (isOpen) {
      if (chipToEdit) {
        const isInternal = availableMenuItems.some(item => item.href === chipToEdit.href);
        const linkType = isInternal ? 'internal' : 'custom';
        
        form.reset({
          linkType: linkType,
          label: chipToEdit.label,
          targetPage: isInternal ? chipToEdit.href as string : undefined,
          customUrl: !isInternal ? chipToEdit.href as string : "",
        });
      } else {
        form.reset({
          linkType: 'internal',
          label: "",
          targetPage: undefined,
          customUrl: "",
        });
      }
    }
  }, [chipToEdit, isOpen, form, availableMenuItems]);


  async function onSubmit(values: AddActionFormData) {
    if (!user) {
      toast({ variant: "destructive", title: "You must be logged in." });
      return;
    }

    let href: string;
    let icon: ActionChipData['icon'];

    if (values.linkType === 'internal') {
        const selectedManager = availableMenuItems.find(m => m.href === values.targetPage);
        if (!selectedManager) {
            toast({ variant: "destructive", title: "Invalid page selected." });
            return;
        }
        href = selectedManager.href;
        icon = selectedManager.icon;
    } else {
        href = values.customUrl;
        const urlIcon = allMenuItems.find(item => item.href.includes('google'))?.icon || Wand2;
        icon = urlIcon; 
    }

    try {
      if (chipToEdit) {
        const updatedActionData: ActionChipData = {
            ...chipToEdit,
            label: values.label,
            href: href,
            icon: icon,
        };
        await updateActionChip(user.uid, updatedActionData, menuType === 'accounting' ? 'accounting' : 'dashboard');
        onActionEdited(updatedActionData);
        toast({ title: "Action Updated" });
      } else {
         const newActionData: Omit<ActionChipData, 'id'> = {
            label: values.label,
            icon: icon,
            href: href,
            userId: user.uid,
         };
         const newAction = await addActionChip(newActionData, menuType === 'accounting' ? 'accounting' : 'dashboard');
         onActionAdded(newAction);
         toast({ title: "Action Added" });
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to save action", description: error.message });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{chipToEdit ? 'Edit Action' : 'Add New Action'}</DialogTitle>
          <DialogDescription>
            {chipToEdit ? 'Modify the details for this action.' : 'Create a shortcut for your Action Dashboard.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Label</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a custom label for the chip" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="linkType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Link Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="internal" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Internal Page
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="custom" />
                        </FormControl>
                        <FormLabel className="font-normal">Custom URL</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {linkType === 'internal' && (
              <FormField
                control={form.control}
                name="targetPage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Page</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        const selected = availableMenuItems.find(item => item.href === value);
                        if (selected && !form.getValues('label')) {
                            form.setValue('label', selected.label);
                        }
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a page to add..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableMenuItems.map((option) => (
                          <SelectItem key={option.href} value={option.href}>
                            <div className="flex items-center gap-2">
                              <option.icon className="h-4 w-4" />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {linkType === 'custom' && (
              <FormField
                control={form.control}
                name="customUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom URL or Path</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com or /my-page" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">{chipToEdit ? 'Save Changes' : 'Add Action'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
