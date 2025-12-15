
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, MoreVertical, Pencil, Trash2, LoaderCircle, Info, ExternalLink } from "lucide-react";
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee, type Employee } from '@/services/payroll-service';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from '../ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Badge } from '../ui/badge';

const employeeSchema = z.object({
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

type EmployeeFormData = z.infer<typeof employeeSchema>;

const defaultFormValues: EmployeeFormData = {
    name: "",
    email: "",
    sin: "",
    workerType: "employee",
    payType: "hourly" as "hourly" | "salary",
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

export function PayrollEmployeesView() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
    
    const { user } = useAuth();
    const { toast } = useToast();

    const form = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: defaultFormValues,
    });

    const loadEmployees = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const fetchedEmployees = await getEmployees(user.uid);
            setEmployees(fetchedEmployees);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load employees', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const handleOpenForm = (employee: Employee | null = null) => {
        setEmployeeToEdit(employee);
        if (employee) {
            form.reset({
                ...employee,
                email: employee.email || "",
                hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : '',
                startDate: employee.startDate ? new Date(employee.startDate).toISOString().split('T')[0] : '',
                notes: employee.notes || "",
            });
        } else {
            form.reset(defaultFormValues);
        }
        setIsFormOpen(true);
    };

    const onSubmit = async (data: EmployeeFormData, shouldAddAnother = false) => {
        if (!user) return;
        
        const employeeData = {
            ...data,
            email: data.email || "",
            sin: data.sin || "",
            hireDate: data.hireDate ? new Date(data.hireDate) : null,
            startDate: data.startDate ? new Date(data.startDate) : null,
            notes: data.notes || "",
        };

        try {
            if (employeeToEdit) {
                await updateEmployee(employeeToEdit.id, employeeData);
                toast({ title: "Worker Updated" });
            } else {
                await addEmployee({ ...employeeData, userId: user.uid });
                toast({ title: "Worker Added" });
            }
            
            if (shouldAddAnother) {
                form.reset(defaultFormValues);
                setEmployeeToEdit(null);
                loadEmployees(); // Refresh list in the background
            } else {
                setIsFormOpen(false);
                loadEmployees();
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!employeeToDelete) return;
        try {
            await deleteEmployee(employeeToDelete.id);
            toast({ title: "Worker Deleted", variant: "destructive" });
            setEmployeeToDelete(null);
            loadEmployees();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        }
    };

    return (
        <>
        <div className="p-4 sm:p-6 space-y-6">
            <AccountingPageHeader pageTitle="Manage Workers" hubPath="/accounting/payroll" hubLabel="Payroll Hub" />
            <header className="text-center">
                <div className="flex items-center justify-center gap-2">
                    <h1 className="text-3xl font-bold font-headline text-primary">Manage Workers</h1>
                    <Button variant="ghost" size="icon" onClick={() => setIsInfoDialogOpen(true)}>
                        <Info className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </div>
                <p className="text-muted-foreground">Add, edit, and manage your employee and contractor records.</p>
            </header>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Worker List</CardTitle>
                        <CardDescription>All employees and contractors in your organization.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => handleOpenForm()}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Worker
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
                    ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Pay Type</TableHead>
                                <TableHead className="text-right">Pay Rate</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.map(emp => (
                            <TableRow key={emp.id}>
                                <TableCell className="font-medium">
                                    <button className="text-left hover:underline" onClick={() => handleOpenForm(emp)}>
                                        {emp.name}
                                    </button>
                                </TableCell>
                                <TableCell><Badge variant={emp.workerType === 'employee' ? 'default' : 'secondary'}>{emp.workerType}</Badge></TableCell>
                                <TableCell className="capitalize">{emp.payType}</TableCell>
                                <TableCell className="text-right font-mono">
                                    {emp.payRate.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                    {emp.payType === 'hourly' && ' / hr'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => handleOpenForm(emp)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setEmployeeToDelete(emp)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
            </Card>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="w-full h-full max-w-none top-0 left-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b text-center sm:text-center">
                    <DialogTitle className="text-2xl font-bold text-primary">{employeeToEdit ? 'Edit Worker' : 'Add New Worker'}</DialogTitle>
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
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex gap-4"
                                            >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="employee" /></FormControl>
                                                <FormLabel className="font-normal">Employee</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="contractor" /></FormControl>
                                                <FormLabel className="font-normal">Independent Contractor</FormLabel>
                                            </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    {/* Left Column */}
                                    <div className="space-y-4">
                                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem> )} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="homePhone" render={({ field }) => ( <FormItem><FormLabel>Home Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                            <FormField control={form.control} name="cellPhone" render={({ field }) => ( <FormItem><FormLabel>Cell Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                        </div>
                                    </div>
                                    {/* Right Column */}
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
                                     <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes Regarding Employee</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                           </div>
                        </ScrollArea>
                        <DialogFooter className="p-6 border-t mt-auto">
                            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                            {!employeeToEdit && (
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

        <AlertDialog open={!!employeeToDelete} onOpenChange={() => setEmployeeToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the worker "{employeeToDelete?.name}".</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Employee vs. Independent Contractor</DialogTitle>
                    <DialogDescription>
                        Understanding the difference is crucial for compliance. Here are some key factors based on CRA guidelines.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p>The CRA looks at the total working relationship to determine employment status. There is no single deciding factor, but here are the main things they consider:</p>
                        <ul>
                            <li><strong>Control:</strong> Does the payer have the right to control what work is done and how it's done? (More control suggests an employee).</li>
                            <li><strong>Tools and Equipment:</strong> Does the worker provide their own tools? (Using own tools suggests a contractor).</li>
                            <li><strong>Financial Risk/Opportunity:</strong> Can the worker make a profit or incur a loss? (Financial risk suggests a contractor).</li>
                            <li><strong>Integration:</strong> Is the worker's role a vital and integral part of the business? (High integration suggests an employee).</li>
                        </ul>
                        <h4 className="font-semibold">Key Differences in Ogeemo</h4>
                        <ul>
                            <li><strong>Employees:</strong> Will have payroll deductions (tax, CPP, EI) calculated and remitted through the payroll system. They receive a T4 slip.</li>
                            <li><strong>Independent Contractors:</strong> Are paid their full invoice amount. No deductions are taken. They are responsible for their own tax remittances and receive a T4A slip if they earn over $500.</li>
                        </ul>
                         <Button asChild variant="link" className="p-0 h-auto">
                            <a href="https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4110.html" target="_blank" rel="noopener noreferrer">
                                Read Official CRA Guide <ExternalLink className="ml-1 h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setIsInfoDialogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
