
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  ArrowLeft,
  ChevronsUpDown,
  Check,
  Plus,
  Trash2,
  ShoppingCart,
  LoaderCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getInventoryItems, type Item as InventoryItem, processSaleTransaction } from '@/services/inventory-service';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

interface SaleItem extends InventoryItem {
  saleQuantity: number;
}

export default function PointOfSalePage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const loadInventory = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
      const items = await getInventoryItems(user.uid);
      setInventory(items);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load inventory.' });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleAddItemToCart = () => {
    if (!selectedItemId || !quantity) {
      toast({ variant: 'destructive', title: 'Invalid Selection', description: 'Please select an item and enter a quantity.' });
      return;
    }

    const itemToAdd = inventory.find(item => item.id === selectedItemId);
    if (!itemToAdd) {
      toast({ variant: 'destructive', title: 'Item not found' });
      return;
    }
    
    if (itemToAdd.stockQuantity < quantity) {
        toast({ variant: 'destructive', title: 'Insufficient Stock', description: `Only ${itemToAdd.stockQuantity} of ${itemToAdd.name} available.` });
        return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === selectedItemId);
      if (existingItem) {
        const newQuantity = existingItem.saleQuantity + Number(quantity);
        if(itemToAdd.stockQuantity < newQuantity) {
            toast({ variant: 'destructive', title: 'Insufficient Stock', description: `Cannot add ${quantity}. Only ${itemToAdd.stockQuantity - existingItem.saleQuantity} more available.` });
            return prevCart;
        }
        return prevCart.map(item =>
          item.id === selectedItemId
            ? { ...item, saleQuantity: newQuantity }
            : item
        );
      }
      return [...prevCart, { ...itemToAdd, saleQuantity: Number(quantity) }];
    });

    setSelectedItemId(null);
    setQuantity(1);
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };
  
  const handleCompleteSale = async () => {
    if (!user || cart.length === 0) {
        toast({ variant: 'destructive', title: 'Cart Empty', description: 'Please add items to the sale first.' });
        return;
    }
    setIsProcessing(true);
    try {
        const saleItems = cart.map(item => ({
            itemId: item.id,
            quantitySold: item.saleQuantity,
        }));
        await processSaleTransaction(user.uid, saleItems);
        toast({
            title: "Sale Completed!",
            description: "Inventory levels have been updated and the transaction has been logged."
        });
        setCart([]);
        // Reload inventory to get updated stock counts
        await loadInventory();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Sale Failed',
            description: error.message
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const selectedItem = inventory.find(item => item.id === selectedItemId);
  const cartTotal = useMemo(() => cart.reduce((total, item) => total + (item.price || 0) * item.saleQuantity, 0), [cart]);

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
        <header className="w-full max-w-4xl text-center relative mb-6">
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
                <Button asChild variant="outline">
                    <Link href="/inventory-manager/track">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Inventory Central
                    </Link>
                </Button>
            </div>
            <h1 className="text-3xl font-bold font-headline text-primary">Point of Sale</h1>
            <p className="text-muted-foreground">Record a new sale transaction.</p>
        </header>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Add Item to Sale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Item</Label>
                <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      <span className="truncate">{selectedItem?.name || "Select an item..."}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Search inventory..." />
                      <CommandList>
                        <CommandEmpty>No items found.</CommandEmpty>
                        <CommandGroup>
                          {inventory.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.name}
                              onSelect={() => {
                                setSelectedItemId(item.id);
                                setIsItemPopoverOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedItemId === item.id ? "opacity-100" : "opacity-0")} />
                              {item.name} <span className="text-xs text-muted-foreground ml-auto">({item.stockQuantity} in stock)</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  min="1"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleAddItemToCart}>
                <Plus className="mr-2 h-4 w-4" /> Add to Sale
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5"/> Current Sale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Remove</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.length > 0 ? cart.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">{item.saleQuantity}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency((item.price || 0) * item.saleQuantity)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No items added to the sale yet.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                 <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
                        <TableCell className="text-right font-bold text-lg font-mono">{formatCurrency(cartTotal)}</TableCell>
                        <TableCell />
                    </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
            <CardFooter>
                <Button className="w-full" size="lg" onClick={handleCompleteSale} disabled={cart.length === 0 || isProcessing}>
                    {isProcessing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isProcessing ? 'Processing...' : 'Complete Sale'}
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
