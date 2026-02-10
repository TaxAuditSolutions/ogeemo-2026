'use client';

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
import { PlusCircle, MoreVertical, Pencil, Trash2, LoaderCircle, Info, ExternalLink, GitMerge } from "lucide-react";
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getWorkers, addWorker, updateWorker, deleteWorker, type Worker, deleteWorkers, mergeWorkers } from '@/services/payroll-service';
import { WorkerFormDialog } from './WorkerFormDialog';
import { Badge } from '../ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import MergeWorkerDialog from './MergeWorkerDialog';
import { Checkbox } from '../ui/checkbox';

export function PayrollEmployeesView() {
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
    const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
    const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
    const [workerToMerge, setWorkerToMerge] = useState<Worker | null>(null);
    
    const { user } = useAuth();
    const { toast } = useToast();

    const loadWorkers = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const fetchedWorkers = await getWorkers(user.uid);
            setWorkers(fetchedWorkers);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load workers', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        loadWorkers();
    }, [loadWorkers]);

    const handleOpenForm = (worker: Worker | null = null) => {
        setWorkerToEdit(worker);
        setIsFormOpen(true);
    };

    const handleWorkerSave = async (workerData: Omit<Worker, 'id' | 'userId'>) => {
        if (!user) return;
        try {
            await addWorker({ ...workerData, userId: user.uid });
            toast({ title: "Worker Added" });
            setIsFormOpen(false);
            setWorkerToEdit(null);
            await loadWorkers();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        }
    };

    const handleWorkerUpdate = async (workerId: string, workerData: Partial<Omit<Worker, 'id' | 'userId'>>) => {
        try {
            await updateWorker(workerId, workerData);
            toast({ title: "Worker Updated" });
            setIsFormOpen(false);
            setWorkerToEdit(null);
            await loadWorkers();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
    };


    const handleConfirmDelete = async () => {
        if (!workerToDelete) return;
        try {
            await deleteWorker(workerToDelete.id);
            toast({ title: "Worker Deleted", variant: "destructive" });
            setWorkerToDelete(null);
            loadWorkers();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        }
    };

    const handleToggleSelect = (workerId: string) => {
        setSelectedWorkerIds(prev => prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]);
    };

    const handleToggleSelectAll = (checked: boolean) => {
        setSelectedWorkerIds(checked ? workers.map(w => w.id) : []);
    };
    
    const handleDeleteSelected = () => {
        if (selectedWorkerIds.length > 0) {
            setIsBulkDeleteAlertOpen(true);
        }
    };
    
    const handleConfirmBulkDelete = async () => {
        if (!user) return;
        try {
            await deleteWorkers(selectedWorkerIds);
            toast({ title: `${selectedWorkerIds.length} worker(s) deleted.`});
            setSelectedWorkerIds([]);
            loadWorkers();
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Bulk delete failed', description: error.message });
        } finally {
            setIsBulkDeleteAlertOpen(false);
        }
    };

    const handleMergeClick = (worker: Worker) => {
        setWorkerToMerge(worker);
        setIsMergeDialogOpen(true);
    };
    
    const handleMergeConfirm = async (sourceWorkerId: string, masterWorkerId: string) => {
        try {
            await mergeWorkers(sourceWorkerId, masterWorkerId);
            toast({ title: "Workers Merged", description: "All records have been reassigned." });
            loadWorkers(); // Refresh data
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Merge Failed', description: error.message });
        }
    };


    return (
        <>
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
                     <div className="flex items-center gap-2">
                        {selectedWorkerIds.length > 0 && (
                            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedWorkerIds.length})
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => handleOpenForm()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Worker
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
                    ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={workers.length > 0 && selectedWorkerIds.length === workers.length}
                                        onCheckedChange={handleToggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>ID Number</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Pay Type</TableHead>
                                <TableHead className="text-right">Pay Rate</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workers.map(emp => (
                            <TableRow key={emp.id}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedWorkerIds.includes(emp.id)}
                                        onCheckedChange={() => handleToggleSelect(emp.id)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">
                                    <button className="text-left hover:underline" onClick={() => handleOpenForm(emp)}>
                                        {emp.name}
                                    </button>
                                </TableCell>
                                <TableCell>{emp.workerIdNumber || 'N/A'}</TableCell>
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
                                            <DropdownMenuItem onSelect={() => handleMergeClick(emp)}><GitMerge className="mr-2 h-4 w-4"/>Merge Duplicate</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setWorkerToDelete(emp)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
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

        <WorkerFormDialog 
            isOpen={isFormOpen} 
            onOpenChange={(isOpen) => {
                setIsFormOpen(isOpen);
                if (!isOpen) {
                    setWorkerToEdit(null); // Clear editing state when dialog closes
                }
            }}
            workerToEdit={workerToEdit}
            onWorkerSave={handleWorkerSave}
            onWorkerUpdate={handleWorkerUpdate}
        />
    
        <AlertDialog open={!!workerToDelete} onOpenChange={() => setWorkerToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{workerToDelete?.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

         <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>
                    This will permanently delete {selectedWorkerIds.length} worker(s). This action cannot be undone.
                </AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction></AlertDialogFooter>
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
        {workerToMerge && (
            <MergeWorkerDialog
                isOpen={isMergeDialogOpen}
                onOpenChange={setIsMergeDialogOpen}
                sourceWorker={workerToMerge}
                allWorkers={workers}
                onMergeConfirm={handleMergeConfirm}
            />
        )}
        </>
    );
}
