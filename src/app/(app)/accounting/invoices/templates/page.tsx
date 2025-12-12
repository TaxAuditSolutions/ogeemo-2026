
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Trash2, Pencil } from 'lucide-react';
import { InvoicePageHeader } from '@/components/accounting/invoice-page-header';
import { useToast } from '@/hooks/use-toast';

interface TemplateItem {
  description: string;
  quantity: number;
  price: number;
}

interface InvoiceTemplate {
  name: string;
  items: TemplateItem[];
}

const INVOICE_TEMPLATES_KEY = 'invoiceTemplates';
const EDIT_INVOICE_TEMPLATE_KEY = 'editInvoiceTemplate';

export default function InvoiceTemplatesPage() {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    try {
      const savedTemplatesRaw = localStorage.getItem(INVOICE_TEMPLATES_KEY);
      if (savedTemplatesRaw) {
        setTemplates(JSON.parse(savedTemplatesRaw));
      }
    } catch (error) {
      console.error('Failed to load invoice templates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load invoice templates.',
      });
    }
  }, [toast]);

  const handleDeleteTemplate = (templateName: string) => {
    if (window.confirm(`Are you sure you want to delete the "${templateName}" template?`)) {
      const updatedTemplates = templates.filter(t => t.name !== templateName);
      setTemplates(updatedTemplates);
      localStorage.setItem(INVOICE_TEMPLATES_KEY, JSON.stringify(updatedTemplates));
      toast({
        title: 'Template Deleted',
        description: `The "${templateName}" template has been removed.`,
      });
    }
  };

  const handleEditTemplate = (template: InvoiceTemplate) => {
    try {
      localStorage.setItem(EDIT_INVOICE_TEMPLATE_KEY, JSON.stringify(template));
      router.push('/accounting/invoices/create');
    } catch (error) {
      console.error('Failed to set template for editing:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not prepare the template for editing.',
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <InvoicePageHeader pageTitle="Invoice Templates" />
      <header className="text-center">
        <h1 className="text-2xl font-bold font-headline text-primary">
          Invoice Templates
        </h1>
        <p className="text-muted-foreground">
          Create and manage reusable templates for your invoices.
        </p>
      </header>

      <div className="text-center mb-6">
        <Button asChild>
          <Link href="/accounting/invoices/create">
            <Plus className="mr-2 h-4 w-4" /> Create New Template
          </Link>
        </Button>
      </div>

      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {templates.map((template, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription>Contains {template.items.length} line item(s).</CardDescription>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.name)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
          <FileText className="mx-auto h-12 w-12" />
          <p className="mt-4">
            No templates found. Create one from the invoice generator to get started.
          </p>
        </div>
      )}
    </div>
  );
}
