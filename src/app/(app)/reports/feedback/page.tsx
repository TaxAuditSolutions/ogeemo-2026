
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LoaderCircle, FileText, ArrowLeft, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFeedback, type FeedbackData } from '@/services/feedback-service';
import { format } from 'date-fns';
import { ReportsPageHeader } from '@/components/reports/page-header';

export default function FeedbackReportPage() {
    const [feedback, setFeedback] = useState<FeedbackData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackData | null>(null);
    const { toast } = useToast();

    const loadFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getFeedback();
            setFeedback(data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to load feedback', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadFeedback();
    }, [loadFeedback]);

    const getVariantForType = (type: FeedbackData['type']): "default" | "secondary" | "destructive" => {
        switch (type) {
            case 'bug': return 'destructive';
            case 'feature': return 'default';
            default: return 'secondary';
        }
    }

    return (
        <>
            <div className="p-4 sm:p-6 space-y-6">
                <ReportsPageHeader pageTitle="Feedback Report" hubPath="/feedback" hubLabel="Feedback Form" />
                <header className="text-center">
                    <h1 className="text-3xl font-bold font-headline text-primary">Feedback Report</h1>
                    <p className="text-muted-foreground">A log of all feedback submitted by users.</p>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle>Submitted Feedback</CardTitle>
                        <CardDescription>
                            Review all bug reports, feature requests, and general comments.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center items-center h-48">
                                <LoaderCircle className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>From</TableHead>
                                            <TableHead>Topic</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {feedback.length > 0 ? (
                                            feedback.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{format(new Date(item.date), 'PPP')}</TableCell>
                                                    <TableCell className="font-medium">{item.reporterName}</TableCell>
                                                    <TableCell>{item.topic}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getVariantForType(item.type)}>{item.type}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedFeedback(item)}>
                                                            <Eye className="mr-2 h-4 w-4" /> View
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    No feedback has been submitted yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{selectedFeedback?.topic}</DialogTitle>
                        <DialogDescription>
                            From: {selectedFeedback?.reporterName} on {selectedFeedback ? format(new Date(selectedFeedback.date), 'PPP') : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 whitespace-pre-wrap text-sm">
                        {selectedFeedback?.feedback}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setSelectedFeedback(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

