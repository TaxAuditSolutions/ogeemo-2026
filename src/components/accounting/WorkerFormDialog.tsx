
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { updateWorker, type Worker } from '@/services/payroll-service';
import { ScrollArea } from '../ui/scroll-area';

const workerSchema = z.object({
    name: z.string().min(2, "Name is required."),
    email: z.string().email("Invalid email address.").optional().or(z.literal('')),
    sin: z.string().optional(),
    workerType: z.enum(["employee", "contractor"]),
    payType: z.enum(["hourly", "salary"]),
    payRate: z.coerce.number().min(0, "Pay rate must be positive."),
    address: z.string().optional(),
    homePhone: z.string().optional(),
    cellPhone: z.string().optional(),
    hireDate: z.string().optional(),
    startDate: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    hasContract: z.boolean().default(false),
    specialNeeds: z.string().optional(),
    notes: z.string().optional(),
});

type WorkerFormData = z.infer<typeof workerSchema>;

const defaultFormValues: WorkerFormData = {
    name: "",
    email: "",
    sin: "",
    workerType: "employee",
    payType: "hourly",
    payRate: 0,
    hasContract: false,
    address: "",
    homePhone: "",
    cellPhone: "",
    hireDate: "",
    startDate: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    specialNeeds: "",
    notes: "",
};

interface WorkerFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  workerToEdit?: Worker | null;
  onWorkerSave: (workerData: Omit<Worker, 'id'>, shouldAddAnother?: boolean) => void;
  onWorkerUpdate: (workerId: string, workerData: Partial<Omit<Worker, 'id' | 'userId'>>) => void;
}

export function WorkerFormDialog({ isOpen, onOpenChange, workerToEdit, onWorkerSave, onWorkerUpdate }: WorkerFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (isOpen) {
        if (workerToEdit) {
            form.reset({
                ...workerToEdit,
                email: workerToEdit.email || "",
                hireDate: workerToEdit.hireDate ? new Date(workerToEdit.hireDate).toISOString().split('T')[0] : '',
                startDate: workerToEdit.startDate ? new Date(workerToEdit.startDate).toISOString().split('T')[0] : '',
                notes: workerToEdit.notes || "",
            });
        } else {
            form.reset(defaultFormValues);
        }
    }
  }, [isOpen, workerToEdit, form]);

  const onSubmit = async (data: WorkerFormData, shouldAddAnother = false) => {
    if (!user) return;
    
    const workerData = {
        ...data,
        userId: user.uid,
        email: data.email || "",
        sin: data.sin || "",
        hireDate: data.hireDate ? new Date(data.hireDate) : null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        notes: data.notes || "",
    };

    if (workerToEdit) {
      onWorkerUpdate(workerToEdit.id, workerData);
    } else {
      onWorkerSave(workerData, shouldAddAnother);
    }

    if (shouldAddAnother) {
      form.reset(defaultFormValues);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b text-center sm:text-center">
          <DialogTitle className="text-2xl font-bold text-primary">{workerToEdit ? 'Edit Worker' : 'Add New Worker'}</DialogTitle>
          <DialogDescription>Fill in the details for this individual.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))} className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="workerType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Worker Type</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                          <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="employee" /></FormControl><FormLabel className="font-normal">Employee</FormLabel></FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="contractor" /></FormControl><FormLabel className="font-normal">Independent Contractor</FormLabel></FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="homePhone" render={({ field }) => ( <FormItem><FormLabel>Home Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="cellPhone" render={({ field }) => ( <FormItem><FormLabel>Cell Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <FormField control={form.control} name="sin" render={({ field }) => ( <FormItem><FormLabel>Social Insurance Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="payType" render={({ field }) => ( <FormItem><FormLabel>Pay Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="hourly">Hourly</SelectItem><SelectItem value="salary">Salary</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="payRate" render={({ field }) => ( <FormItem><FormLabel>Pay Rate</FormLabel><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span><FormControl><Input type="number" className="pl-7" {...field} /></FormControl></div><FormMessage /></FormItem> )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="hireDate" render={({ field }) => ( <FormItem><FormLabel>Date Hired</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem><FormLabel>Work Started</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <div className="border p-4 rounded-md space-y-4">
                      <h3 className="text-sm font-semibold mb-2">Emergency Contact</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="emergencyContactName" render={({ field }) => ( <FormItem><FormLabel>Contact Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => ( <FormItem><FormLabel>Contact Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      </div>
                    </div>
                    <FormField control={form.control} name="hasContract" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl><div className="space-y-1 leading-none"><FormLabel>Employment Contract on File?</FormLabel></div></FormItem> )} />
                  </div>
                </div>
                <div className="space-y-4">
                  <FormField control={form.control} name="specialNeeds" render={({ field }) => ( <FormItem><FormLabel>Special Needs or Accommodations</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes Regarding Worker</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-6 border-t mt-auto">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              {!workerToEdit && (
                  <Button type="button" onClick={form.handleSubmit((data) => onSubmit(data, true))}>
                      Save & Add Another
                  </Button>
              )}
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
