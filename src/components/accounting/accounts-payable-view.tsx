
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Pencil, Trash2, HandCoins, LoaderCircle, ChevronsUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { 
    addPayableBill, updatePayableBill, deletePayableBill, 
    type PayableBill,
    getCompanies, addCompany, type Company,
    getExpenseCategories, addExpenseCategory, type ExpenseCategory,
} from "@/services/accounting-service";
import { cn } from "@/lib/utils";


const emptyBillForm = { vendor: '', invoiceNumber: '', dueDate: '', totalAmount: '', taxRate: '', preTaxAmount: '', taxAmount: '', category: '', description: '', documentUrl: '' };

interface AccountsPayableViewProps {
    payableLedger: PayableBill[];
    isLoading: boolean;
    onRecordPayment: (bill: PayableBill) => Promise<void>;
    companies: Company[];
    expenseCategories: ExpenseCategory[];
    onCompaniesChange: (companies: Company[]) => void;
    onExpenseCategoriesChange: (categories: ExpenseCategory[]) => void;
    onPayableLedgerChange: (ledger: PayableBill[]) => void;
}

export function AccountsPayableView({ 
    payableLedger, 
    isLoading, 
    onRecordPayment,
    companies,
    expenseCategories,
    onCompaniesChange,
    onExpenseCategoriesChange,
    onPayableLedgerChange
}: AccountsPayableViewProps) {
  const { user } = useAuth();
  
  const [isBillDialogOpen, setIsBillDialogOpen] = React.useState(false);
  const [billToEdit, setBillToEdit] = React.useState<PayableBill | null>(null);
  const [billToDelete, setBillToDelete] = React.useState<PayableBill | null>(null);
  const [newBill, setNewBill] = React.useState(emptyBillForm);
  
  const [isVendorPopoverOpen, setIsVendorPopoverOpen] = React.useState(false);
  const [vendorSearchValue, setVendorSearchValue] = React.useState('');
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = React.useState(false);
  const [categorySearchValue, setCategorySearchValue] = React.useState('');


  const { toast } = useToast();
  
  const totalPayableAmount = React.useMemo(() => {
    return payableLedger.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
  }, [payableLedger]);

    React.useEffect(() => {
        const totalAmount = parseFloat(newBill.totalAmount);
        const taxRate = parseFloat(newBill.taxRate);

        if (!isNaN(totalAmount) && !isNaN(taxRate) && taxRate > 0) {
            const preTax = totalAmount / (1 + taxRate / 100);
            const tax = totalAmount - preTax;
            setNewBill(prev => ({
                ...prev,
                preTaxAmount: preTax.toFixed(2),
                taxAmount: tax.toFixed(2)
            }));
        } else if (!isNaN(totalAmount)) {
             setNewBill(prev => ({
                ...prev,
                preTaxAmount: totalAmount.toFixed(2),
                taxAmount: '0.00'
            }));
        } else {
            setNewBill(prev => ({ ...prev, preTaxAmount: '', taxAmount: '' }));
        }
    }, [newBill.totalAmount, newBill.taxRate]);
  
  const handleOpenBillDialog = (bill?: PayableBill) => {
      if (bill) {
          setBillToEdit(bill);
          setNewBill({ 
              ...bill, 
              totalAmount: String(bill.totalAmount), 
              taxRate: String(bill.taxRate || ''),
              preTaxAmount: String(bill.preTaxAmount || ''),
              taxAmount: String(bill.taxAmount || ''),
              documentUrl: bill.documentUrl || '' 
            });
      } else {
          setBillToEdit(null);
          setNewBill(emptyBillForm);
      }
      setIsBillDialogOpen(true);
  };
  
  const handleSaveBill = async () => {
    if (!user) return;
      const totalAmountNum = parseFloat(newBill.totalAmount);
      const taxRateNum = parseFloat(newBill.taxRate) || 0;
      if (!newBill.vendor || !newBill.dueDate || !newBill.category || !newBill.totalAmount || isNaN(totalAmountNum) || totalAmountNum <= 0) {
          toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please fill all required fields correctly.' });
          return;
      }
      
      const preTaxAmount = totalAmountNum / (1 + taxRateNum / 100);
      const taxAmount = totalAmountNum - preTaxAmount;
      
      const billData = {
          vendor: newBill.vendor,
          invoiceNumber: newBill.invoiceNumber,
          dueDate: newBill.dueDate,
          totalAmount: totalAmountNum,
          preTaxAmount: preTaxAmount,
          taxAmount: taxAmount,
          taxRate: taxRateNum,
          category: newBill.category,
          description: newBill.description,
          documentUrl: newBill.documentUrl,
      };

      try {
        if (billToEdit) {
            await updatePayableBill(billToEdit.id, billData);
            onPayableLedgerChange(payableLedger.map(item => item.id === billToEdit.id ? { ...item, ...billData, id: billToEdit.id, userId: user.uid } : item));
            toast({ title: "Bill Updated" });
        } else {
            const newEntry = await addPayableBill({ ...billData, userId: user.uid });
            onPayableLedgerChange([newEntry, ...payableLedger]);
            toast({ title: "Bill Added" });
        }
        setIsBillDialogOpen(false);
      } catch (error: any) {
         toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
      }
  };
  
  const handleConfirmDelete = async () => {
      if (!billToDelete) return;
      try {
        await deletePayableBill(billToDelete.id);
        onPayableLedgerChange(payableLedger.filter(b => b.id !== billToDelete.id));
        toast({ title: 'Bill Deleted', variant: 'destructive' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
      } finally {
        setBillToDelete(null);
      }
  };
  
  const handleCreateCompany = async (companyName: string) => {
    if (!user || !companyName.trim()) return;
    try {
        const newCompany = await addCompany({ name: companyName.trim(), userId: user.uid });
        onCompaniesChange([...companies, newCompany]);
        setNewBill(prev => ({ ...prev, vendor: companyName.trim() }));
        setIsVendorPopoverOpen(false);
        setVendorSearchValue('');
        toast({ title: 'Vendor Created', description: `"${companyName.trim()}" has been added.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to create vendor', description: error.message });
    }
  };

  const handleCreateExpenseCategory = async (categoryName: string) => {
    if (!user || !categoryName.trim()) return;
    try {
        const newCategory = await addExpenseCategory({ name: categoryName.trim(), userId: user.uid });
        onExpenseCategoriesChange([...expenseCategories, newCategory]);
        setNewBill(prev => ({ ...prev, category: categoryName.trim() }));
        setIsCategoryPopoverOpen(false);
        setCategorySearchValue('');
        toast({ title: 'Category Created', description: `"${categoryName.trim()}" has been added.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to create category', description: error.message });
    }
  };

  const renderDocumentNumber = (bill: PayableBill) => {
    if (bill.documentUrl) {
      return (
        <a href={bill.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {bill.invoiceNumber || 'View'}
        </a>
      );
    }
    return bill.invoiceNumber;
  };
  
  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col items-center">
            <div className="flex justify-between items-start w-full">
              <div className="w-1/4"></div>
              <div className="text-center flex-1">
                  <CardTitle>Accounts Payable</CardTitle>
                  <CardDescription>Payments due to others</CardDescription>
              </div>
              <div className="text-right w-1/4">
                  <p className="text-sm text-muted-foreground">Total Due</p>
                  <p className="text-2xl font-bold text-destructive">{totalPayableAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
              </div>
            </div>
            <div className="pt-2">
              <Button variant="outline" onClick={() => handleOpenBillDialog()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Bill
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <LoaderCircle className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payableLedger.map(bill => (
                    <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.vendor}</TableCell>
                        <TableCell>{bill.description}</TableCell>
                        <TableCell>{renderDocumentNumber(bill)}</TableCell>
                        <TableCell>{bill.dueDate}</TableCell>
                        <TableCell>{bill.category}</TableCell>
                        <TableCell className="text-right font-mono">
                        {(bill.totalAmount || 0).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                        </TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onRecordPayment(bill)}><HandCoins className="mr-2 h-4 w-4"/>Record Payment</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleOpenBillDialog(bill)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onSelect={() => setBillToDelete(bill)}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
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

      <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{billToEdit ? 'Edit Bill' : 'Add New Bill'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor <span className="text-destructive">*</span></Label>
                <Popover open={isVendorPopoverOpen} onOpenChange={setIsVendorPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                            {newBill.vendor || "Select or create vendor..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search vendor..." value={vendorSearchValue} onValueChange={setVendorSearchValue} />
                            <CommandList>
                                <CommandEmpty>
                                    {vendorSearchValue && !companies.some(c => c.name.toLowerCase() === vendorSearchValue.toLowerCase()) && (
                                        <CommandItem onSelect={() => handleCreateCompany(vendorSearchValue)} className="cursor-pointer">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Create "{vendorSearchValue}"
                                        </CommandItem>
                                    )}
                                </CommandEmpty>
                                <CommandGroup>
                                    {companies.map((c) => (
                                        <CommandItem key={c.id} value={c.name} onSelect={() => { setNewBill(prev => ({ ...prev, vendor: c.name })); setIsVendorPopoverOpen(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", newBill.vendor === c.name ? "opacity-100" : "opacity-0")} />
                                            {c.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date <span className="text-destructive">*</span></Label>
                <Input id="dueDate" type="date" value={newBill.dueDate} onChange={e => setNewBill(p => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount <span className="text-destructive">*</span></Label>
                <Input id="totalAmount" type="number" placeholder="0.00" value={newBill.totalAmount} onChange={e => setNewBill(p => ({ ...p, totalAmount: e.target.value }))} />
              </div>
               <div className="space-y-2">
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input id="taxRate" type="number" value={newBill.taxRate} onChange={e => setNewBill(p => ({ ...p, taxRate: e.target.value }))} placeholder="e.g., 15"/>
                </div>
              <div className="space-y-2">
                <Label htmlFor="category">Expense Category <span className="text-destructive">*</span></Label>
                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                            {newBill.category || "Select or create category..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search category..." value={categorySearchValue} onValueChange={setCategorySearchValue} />
                            <CommandList>
                                <CommandEmpty>
                                     {categorySearchValue && !expenseCategories.some(c => c.name.toLowerCase() === categorySearchValue.toLowerCase()) && (
                                        <CommandItem onSelect={() => handleCreateExpenseCategory(categorySearchValue)} className="cursor-pointer">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Create "{categorySearchValue}"
                                        </CommandItem>
                                    )}
                                </CommandEmpty>
                                <CommandGroup>
                                    {expenseCategories.map((c) => (
                                        <CommandItem
                                            key={c.id}
                                            value={c.name}
                                            onSelect={() => {
                                                setNewBill(prev => ({ ...prev, category: c.name }));
                                                setIsCategoryPopoverOpen(false);
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", newBill.category.toLowerCase() === c.name.toLowerCase() ? "opacity-100" : "opacity-0")} />
                                            {c.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
              </div>
               <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice / Document #</Label>
                <Input id="invoiceNumber" value={newBill.invoiceNumber} onChange={e => setNewBill(p => ({ ...p, invoiceNumber: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={newBill.description} onChange={e => setNewBill(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentUrl">Document Link</Label>
                <Input id="documentUrl" placeholder="https://..." value={newBill.documentUrl} onChange={e => setNewBill(p => ({ ...p, documentUrl: e.target.value }))} />
              </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsBillDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBill}>{billToEdit ? 'Save Changes' : 'Add Bill'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!billToDelete} onOpenChange={() => setBillToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this bill from your payable list.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
