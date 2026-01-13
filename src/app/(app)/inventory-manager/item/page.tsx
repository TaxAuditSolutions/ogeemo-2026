'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { LoaderCircle, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

// A minimal schema for just the test field.
const itemFormSchema = z.object({
  test: z.string().optional(),
});
type ItemFormData = z.infer<typeof itemFormSchema>;

export default function ItemFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get('id');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      test: '',
    },
  });

  // This function is a placeholder and will be built out as we add more fields.
  async function onSubmit(data: ItemFormData) {
    console.log(data);
    toast({
      title: "Form Submitted",
      description: `Data: ${JSON.stringify(data)}`
    })
  }
  
  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
      <header className="w-full max-w-2xl text-center relative mb-6">
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <Button asChild variant="outline">
                <Link href="/inventory-manager/track">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Inventory
                </Link>
            </Button>
        </div>
        <h1 className="text-3xl font-bold font-headline text-primary">
          {itemId ? 'Edit Item Details' : 'Add New Inventory Item'}
        </h1>
      </header>

      <Card className="w-full max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Item Information</CardTitle>
              <CardDescription>Enter all the relevant details for this inventory item.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 min-h-[200px]">
              <FormField
                control={form.control}
                name="test"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>test</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter data..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
