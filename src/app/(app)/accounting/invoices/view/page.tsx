
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoaderCircle, FileDigit, BrainCircuit, CheckCircle, ArrowRight, FolderSearch, Landmark, X, RefreshCw, CloudSync, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { getFiles, type FileItem } from '@/services/file-service';
import { extractInvoiceData, type ExtractedInvoice } from '@/app/actions/ocr-actions';
import { addPayableBill, getExpenseCategories, type ExpenseCategory } from '@/services/accounting-service';
import { getReceiptsFolderPdfs, type GDriveFile } from '@/services/google-service';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function InvoiceIntelligencePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [pendingFiles, setPendingFiles] = useState<FileItem[]>([]);
    const [gdriveFiles, setGdriveFiles] = useState<GDriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<ExtractedInvoice | null>(null);
    const [activeSource, setActiveSource] = useState<'internal' | 'gdrive'>('internal');

    const loadData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const allFiles = await getFiles(user.uid);
            // Filter for PDFs from the Document Manager
            setPendingFiles(allFiles.filter(f => f.name.toLowerCase().endsWith('.pdf')));
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Load Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    const syncGDrive = async () => {
        setIsSyncing(true);
        try {
            const result = await getReceiptsFolderPdfs();
            if (result.error) throw new Error(result.error);
            setGdriveFiles(result.files);
            toast({ title: 'GDrive Synced', description: `Found ${result.files.length} PDFs in the Receipts folder.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Sync Failed', description: error.message });
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => { 
        loadData(); 
        syncGDrive();
    }, [loadData]);

    const handleExtract = async (id: string, name: string, isExternal: boolean) => {
        setSelectedFileId(id);
        setSelectedFileName(name);
        setIsExtracting(true);
        setExtractedData(null);
        try {
            const result = await extractInvoiceData(id, isExternal);
            if (result.error) throw new Error(result.error);
            setExtractedData(result.data!);
            toast({ title: 'Extraction Complete', description: 'Gemini 1.5 Pro has successfully parsed the document.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Neural Error', description: error.message });
        } finally {
            setIsExtracting(false);
        }
    };

    const handlePostToPayables = async () => {
        if (!user || !extractedData) return;
        try {
            await addPayableBill({
                vendor: extractedData.vendor_name,
                invoiceNumber: extractedData.invoice_number,
                dueDate: extractedData.date,
                totalAmount: extractedData.total_amount,
                preTaxAmount: extractedData.subtotal,
                taxAmount: extractedData.tax,
                category: '9270', // Default to Other Expenses
                description: `Intelligence extraction from ${selectedFileName}`,
                userId: user.uid,
            });
            toast({ title: 'Payable Logged', description: 'Record successfully added to Accounts Payable.' });
            setExtractedData(null);
            setSelectedFileId(null);
            setSelectedFileName(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Post Failed', description: error.message });
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 flex flex-col h-full bg-muted/10">
            <header className="text-center relative">
                <div className="flex items-center justify-center gap-3">
                    <BrainCircuit className="h-10 w-10 text-primary" />
                    <h1 className="text-4xl font-bold font-headline text-primary tracking-tight">Invoice Intelligence</h1>
                </div>
                <p className="text-muted-foreground mt-2">Neural extraction node for high-fidelity financial ingestion.</p>
                <div className="absolute top-0 right-0">
                    <Button asChild variant="ghost" size="icon"><Link href="/accounting/invoices/create"><X className="h-5 w-5"/></Link></Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full flex-1">
                <Card className="lg:col-span-1 flex flex-col border-primary/20">
                    <CardHeader className="bg-primary/5 border-b py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FolderSearch className="h-5 w-5" /> Document Archive
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={syncGDrive} disabled={isSyncing}>
                                <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0">
                        <Tabs defaultValue="internal" onValueChange={(v: any) => setActiveSource(v)} className="w-full">
                            <TabsList className="w-full rounded-none h-10 bg-muted/50">
                                <TabsTrigger value="internal" className="flex-1 text-xs uppercase font-bold">Internal Hub</TabsTrigger>
                                <TabsTrigger value="gdrive" className="flex-1 text-xs uppercase font-bold">GDrive Receipts</TabsTrigger>
                            </TabsList>
                            <TabsContent value="internal" className="m-0">
                                <ScrollArea className="h-[500px]">
                                    {isLoading ? (
                                        <div className="flex justify-center p-12"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
                                    ) : pendingFiles.length > 0 ? (
                                        <div className="divide-y">
                                            {pendingFiles.map(file => (
                                                <div key={file.id} className={cn("p-4 hover:bg-muted/50 transition-colors cursor-pointer", selectedFileId === file.id && "bg-primary/10")} onClick={() => handleExtract(file.id, file.name, false)}>
                                                    <p className="font-bold text-sm truncate">{file.name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase mt-1">Ogeemo Local Record</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-muted-foreground italic text-sm">No internal PDFs found.</div>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="gdrive" className="m-0">
                                <ScrollArea className="h-[500px]">
                                    {isSyncing ? (
                                        <div className="flex justify-center p-12"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
                                    ) : gdriveFiles.length > 0 ? (
                                        <div className="divide-y">
                                            {gdriveFiles.map(file => (
                                                <div key={file.id} className={cn("p-4 hover:bg-muted/50 transition-colors cursor-pointer", selectedFileId === file.id && "bg-primary/10")} onClick={() => handleExtract(file.id, file.name, true)}>
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="h-3 w-3 text-blue-500" />
                                                        <p className="font-bold text-sm truncate">{file.name}</p>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground uppercase mt-1">Source: GDrive/Receipts • {file.size}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-muted-foreground italic text-sm">No files found in Receipts folder.</div>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 flex flex-col shadow-xl">
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle>Extraction Workspace</CardTitle>
                            {extractedData && <Badge className="bg-green-500">Analysis Successful</Badge>}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/20">
                        {isExtracting ? (
                            <div className="text-center space-y-4">
                                <LoaderCircle className="h-12 w-12 animate-spin text-primary mx-auto" />
                                <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Gemini 1.5 Pro Analyzing Vision Binary...</p>
                            </div>
                        ) : extractedData ? (
                            <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in-95">
                                <div className="text-center space-y-1">
                                    <h3 className="text-2xl font-bold text-primary">{extractedData.vendor_name}</h3>
                                    <p className="text-sm text-muted-foreground">Invoice #{extractedData.invoice_number}</p>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-y-4 text-sm">
                                    <span className="text-muted-foreground">Invoice Date</span>
                                    <span className="text-right font-bold">{extractedData.date}</span>
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="text-right font-mono">${extractedData.subtotal.toFixed(2)}</span>
                                    <span className="text-muted-foreground">Tax</span>
                                    <span className="text-right font-mono">${extractedData.tax.toFixed(2)}</span>
                                    <Separator className="col-span-2" />
                                    <span className="font-bold">Total Amount</span>
                                    <span className="text-right font-mono text-xl font-bold text-primary">${extractedData.total_amount.toFixed(2)}</span>
                                </div>
                                <Button className="w-full h-12 text-lg font-bold shadow-lg" onClick={handlePostToPayables}>
                                    <Landmark className="mr-2 h-5 w-5" /> Post to Accounts Payable
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center opacity-30 max-w-xs">
                                <CloudSync className="h-16 w-16 mx-auto mb-4" />
                                <p className="text-sm font-semibold uppercase tracking-widest">Select a document from the archive to begin neural extraction.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="bg-muted/30 p-4 border-t text-[10px] uppercase font-bold text-muted-foreground tracking-widest justify-center">
                        Secure Operational Node • Gemini 1.5 Pro Core
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
