'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Eye,
  Inbox,
  LoaderCircle,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getInquiries, setInquiryStatus, type InquiryRecord } from '@/services/inquiry-service';
import { format } from 'date-fns';

function displayName(inquiry: InquiryRecord): string {
  if (inquiry.firstName || inquiry.lastName) {
    return `${inquiry.firstName || ''} ${inquiry.lastName || ''}`.trim();
  }
  return inquiry.name || 'Unknown';
}

function inquirySubject(inquiry: InquiryRecord): string {
  if (inquiry.type === 'partnership') {
    return `Partnership — ${inquiry.focus || 'General'}`;
  }
  return inquiry.subject || '(No subject)';
}

function inquiryTypeBadge(inquiry: InquiryRecord): { label: string; variant: 'default' | 'secondary' } {
  return inquiry.type === 'partnership'
    ? { label: 'Partnership', variant: 'default' }
    : { label: 'Contact', variant: 'secondary' };
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);
  const { toast } = useToast();

  const loadInquiries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getInquiries();
      setInquiries(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load inquiries',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const handleToggleStatus = async (inquiry: InquiryRecord) => {
    const nextStatus = inquiry.status === 'new' ? 'read' : 'new';
    try {
      await setInquiryStatus(inquiry.id, nextStatus);
      setInquiries((prev) =>
        prev.map((item) => (item.id === inquiry.id ? { ...item, status: nextStatus } : item))
      );
      setSelectedInquiry((prev) =>
        prev && prev.id === inquiry.id ? { ...prev, status: nextStatus } : prev
      );
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not update inquiry',
        description: error.message,
      });
    }
  };

  const handleOpenInquiry = (inquiry: InquiryRecord) => {
    setSelectedInquiry(inquiry);
    if (inquiry.status === 'new') {
      handleToggleStatus(inquiry);
    }
  };

  const newCount = inquiries.filter((inquiry) => inquiry.status === 'new').length;

  const detailRows = (inquiry: InquiryRecord): { label: string; value?: string }[] => [
    { label: 'From', value: displayName(inquiry) },
    { label: 'Email', value: inquiry.email },
    ...(inquiry.type === 'partnership'
      ? [
          { label: 'Organization', value: inquiry.company },
          { label: 'Partnership Focus', value: inquiry.focus },
          { label: 'Website', value: inquiry.website || 'Not provided' },
        ]
      : [{ label: 'Subject', value: inquiry.subject }]),
    { label: 'Message', value: inquiry.message },
    {
      label: 'Submitted',
      value: inquiry.createdAt ? format(inquiry.createdAt, 'PPP p') : '—',
    },
    {
      label: 'Notification Email',
      value:
        inquiry.notified === true
          ? `Sent to ${inquiry.targetEmail || 'the team'}`
          : inquiry.notified === false
            ? `Not sent${inquiry.notifyError ? ` (${inquiry.notifyError})` : ''}`
            : 'Unknown (submitted before notifications were enabled)',
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 flex flex-col items-center">
      <header className="text-center relative w-full max-w-4xl">
        <div className="absolute top-0 left-0">
          <Button variant="outline" size="sm" asChild>
            <Link href="/action-manager">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Inbox className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold font-headline text-primary">Inquiries</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Every contact and partnership form submission lands here first — the email alerts to
          notifications@ogeemo.com and dan@ogeemo.com are the backup channel.
        </p>
      </header>

      <Card className="w-full max-w-6xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Form Submissions</CardTitle>
            <CardDescription>
              {newCount > 0
                ? `${newCount} new signal${newCount === 1 ? '' : 's'} awaiting review.`
                : 'You are all caught up.'}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={loadInquiries} disabled={isLoading}>
            {isLoading ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : inquiries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No inquiries yet. Submissions from the public Contact and Partners forms will appear here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email Alert</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry) => {
                  const typeBadge = inquiryTypeBadge(inquiry);
                  return (
                    <TableRow key={inquiry.id} className={inquiry.status === 'new' ? 'bg-primary/5' : ''}>
                      <TableCell className="whitespace-nowrap">
                        {inquiry.createdAt ? format(inquiry.createdAt, 'MMM d, yyyy p') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{displayName(inquiry)}</div>
                        <div className="text-sm text-muted-foreground">{inquiry.email || '—'}</div>
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <div className="truncate font-medium">{inquirySubject(inquiry)}</div>
                        <div className="truncate text-sm text-muted-foreground">{inquiry.message || ''}</div>
                      </TableCell>
                      <TableCell>
                        {inquiry.status === 'new' ? (
                          <Badge>New</Badge>
                        ) : (
                          <Badge variant="outline">Read</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {inquiry.notified === true ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm" title={`Sent to ${inquiry.targetEmail || 'the team'}`}>
                            <CheckCircle2 className="h-4 w-4" /> Sent
                          </span>
                        ) : inquiry.notified === false ? (
                          <span
                            className="inline-flex items-center gap-1 text-amber-600 text-sm"
                            title={inquiry.notifyError || 'Notification email was not sent'}
                          >
                            <CircleAlert className="h-4 w-4" /> Failed
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenInquiry(inquiry)} title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(inquiry)}
                          title={inquiry.status === 'new' ? 'Mark as read' : 'Mark as new'}
                        >
                          {inquiry.status === 'new' ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedInquiry} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedInquiry ? inquirySubject(selectedInquiry) : ''}</DialogTitle>
            <DialogDescription>
              {selectedInquiry
                ? `${inquiryTypeBadge(selectedInquiry).label} submission received ${
                    selectedInquiry.createdAt ? format(selectedInquiry.createdAt, 'PPP p') : ''
                  }`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {selectedInquiry &&
              detailRows(selectedInquiry).map((row) => (
                <div key={row.label} className="grid grid-cols-[140px_1fr] gap-3 text-sm">
                  <div className="font-semibold text-muted-foreground">{row.label}</div>
                  <div className="whitespace-pre-wrap break-words">{row.value || '—'}</div>
                </div>
              ))}
          </div>
          <DialogFooter className="gap-2">
            {selectedInquiry && (
              <>
                <Button variant="outline" onClick={() => handleToggleStatus(selectedInquiry)}>
                  {selectedInquiry.status === 'new' ? 'Mark as Read' : 'Mark as New'}
                </Button>
                {selectedInquiry.email && (
                  <Button asChild>
                    <a href={`mailto:${selectedInquiry.email}?subject=${encodeURIComponent(
                      `Re: ${inquirySubject(selectedInquiry)}`
                    )}`}>
                      <Mail className="mr-2 h-4 w-4" /> Reply
                    </a>
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



