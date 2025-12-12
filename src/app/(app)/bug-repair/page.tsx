'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Save, Eraser, LoaderCircle, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { findOrCreateFileFolder, updateFile, addTextFileClient } from '@/services/file-service';
import { useReactToPrint } from '@/hooks/use-react-to-print';
import { getIncomeTransactions, type IncomeTransaction } from '@/services/accounting-service';

const TEST_FOLDER_NAME = "Bug Repair Tests";

export default function BugRepairPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { handlePrint, contentRef } = useReactToPrint();
  const [showTestCard, setShowTestCard] = useState(false);
  
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [consultingTotal, setConsultingTotal] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateConsultingTotal = useCallback(async () => {
    if (!user) return;
    setIsCalculating(true);
    try {
        const incomeTransactions = await getIncomeTransactions(user.uid);
        const total = incomeTransactions
            .filter(tx => tx.incomeCategory === 'Consulting')
            .reduce((acc, tx) => acc + (Number(tx.totalAmount) || 0), 0); // Guard against non-numeric values
        setConsultingTotal(total);
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Calculation Failed",
            description: error.message || 'Could not fetch and calculate income data.',
        });
    } finally {
        setIsCalculating(false);
    }
  }, [user, toast]);

  const handleShowTestCard = () => {
    setShowTestCard(prev => !prev);
    if (!showTestCard) { // Only calculate when opening the card
        calculateConsultingTotal();
    }
  };


  const handleSave = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be logged in to save.'});
        return;
    }
    const content = editorRef.current?.innerHTML || '';
    if (!content.trim()) {
        toast({ variant: 'destructive', title: 'Cannot save empty content.' });
        return;
    }

    setIsSaving(true);
    try {
        const testFolder = await findOrCreateFileFolder(user.uid, TEST_FOLDER_NAME);

        if (currentFileId) {
            // Update existing file
            await updateFile(currentFileId, { content });
             toast({
                title: "Content Updated",
                description: `Your content has been saved.`,
            });
        } else {
            // Create new file
            const newFile = await addTextFileClient(
                user.uid,
                testFolder.id,
                `Test Document ${new Date().toLocaleTimeString()}`,
                content
            );
            setCurrentFileId(newFile.id);
            toast({
                title: "Content Saved",
                description: `A new test file has been created in the "${TEST_FOLDER_NAME}" folder.`,
            });
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: "Save Failed",
            description: error.message || 'An unknown error occurred.',
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setCurrentFileId(null);
    toast({
      title: "Content Cleared",
    });
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col items-center">
      <header className="text-center mb-6">
          <h1 className="text-3xl font-bold font-headline text-primary">Isolated Text Editor</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A safe environment to build and test a simple text editor.
          </p>
      </header>
      
      <Card className="w-full max-w-4xl flex-1 flex flex-col" ref={contentRef}>
        <CardHeader>
          <CardTitle>Sandbox Editor</CardTitle>
          <CardDescription>
            This editor saves HTML content to the dedicated "{TEST_FOLDER_NAME}" folder in your Document Manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div
            ref={editorRef}
            contentEditable
            className="prose dark:prose-invert max-w-none flex-1 p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Start typing here..."
          />
        </CardContent>
        <div className="p-4 border-t flex justify-end gap-2">
            <Button onClick={handleShowTestCard}>Other</Button>
            <Button onClick={handleSave}>Test</Button>
            <Button variant="outline" onClick={handlePrint} disabled={isSaving}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Button variant="outline" onClick={handleClear} disabled={isSaving}><Eraser className="mr-2 h-4 w-4" /> Clear</Button>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
            </Button>
        </div>
      </Card>
      
      {showTestCard && (
        <Card className="w-full max-w-4xl mt-6">
            <CardHeader>
                <CardTitle>Test Card</CardTitle>
                <CardDescription>This card displays the total from the "Consulting" income category.</CardDescription>
            </CardHeader>
            <CardContent>
                {isCalculating ? (
                    <div className="flex items-center gap-2">
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        <p>Calculating...</p>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-muted-foreground">Total Consulting Income:</p>
                        <p className="text-3xl font-bold">{consultingTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                    </div>
                )}
            </CardContent>
        </Card>
      )}
    </div>
  );
}
