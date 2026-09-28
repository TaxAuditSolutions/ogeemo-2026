'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InvoicePageHeader } from '@/components/accounting/invoice-page-header';
import { useToast } from '@/hooks/use-toast';
import { TemplatesTable, ensureTemplateIds, type StoredTemplate } from '@/components/accounting/templates-table';

const QUOTE_TEMPLATES_KEY = 'quoteTemplates';
const EDIT_QUOTE_TEMPLATE_KEY = 'editQuoteTemplate';

export default function QuoteTemplatesPage() {
  const [templates, setTemplates] = useState<StoredTemplate[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    try {
      const savedTemplatesRaw = localStorage.getItem(QUOTE_TEMPLATES_KEY);
      if (savedTemplatesRaw) {
        setTemplates(ensureTemplateIds(JSON.parse(savedTemplatesRaw), 'qt'));
      }
    } catch (error) {
      console.error('Failed to load quote templates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load quote templates.',
      });
    }
  }, [toast]);

  const handleUse = (template: StoredTemplate) => {
    try {
      localStorage.setItem(EDIT_QUOTE_TEMPLATE_KEY, JSON.stringify(template));
      router.push('/accounting/quotes/create');
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
      <InvoicePageHeader pageTitle="Quote Templates" />
      <header className="text-center">
        <h1 className="text-2xl font-bold font-headline text-primary">Quote Templates</h1>
        <p className="text-muted-foreground">
          Create and manage reusable templates for your quotes.
        </p>
      </header>

      <TemplatesTable
        templates={templates}
        onTemplatesChange={setTemplates}
        storageKey={QUOTE_TEMPLATES_KEY}
        onUse={handleUse}
        createHref="/accounting/quotes/create"
        entityLabel="Quote"
        emptyHint="No templates found. Create one from the quote generator to get started."
      />
    </div>
  );
}
