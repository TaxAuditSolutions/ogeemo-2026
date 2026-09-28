'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InvoicePageHeader } from '@/components/accounting/invoice-page-header';
import { useToast } from '@/hooks/use-toast';
import { TemplatesTable, ensureTemplateIds, type StoredTemplate } from '@/components/accounting/templates-table';

const INVOICE_TEMPLATES_KEY = 'invoiceTemplates';
const EDIT_INVOICE_TEMPLATE_KEY = 'editInvoiceTemplate';

export default function InvoiceTemplatesPage() {
  const [templates, setTemplates] = useState<StoredTemplate[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    try {
      const savedTemplatesRaw = localStorage.getItem(INVOICE_TEMPLATES_KEY);
      if (savedTemplatesRaw) {
        setTemplates(ensureTemplateIds(JSON.parse(savedTemplatesRaw), 'inv'));
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

  const handleUse = (template: StoredTemplate) => {
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
        <h1 className="text-2xl font-bold font-headline text-primary">Invoice Templates</h1>
        <p className="text-muted-foreground">
          Create and manage reusable templates for your invoices.
        </p>
      </header>

      <TemplatesTable
        templates={templates}
        onTemplatesChange={setTemplates}
        storageKey={INVOICE_TEMPLATES_KEY}
        onUse={handleUse}
        createHref="/accounting/invoices/create"
        entityLabel="Invoice"
        emptyHint="No templates found. Create one from the invoice generator to get started."
      />
    </div>
  );
}
