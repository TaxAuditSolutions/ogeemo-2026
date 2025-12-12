'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { WorkflowDiagram } from '@/components/workflow-chart/WorkflowDiagram';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type GenerateFlowchartOutput } from '@/ai/flows/generate-flowchart-flow';
import { LoaderCircle, WandSparkles, Save, FolderOpen, Trash2, Plus, Info } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { addFileRecord, getFilesForFolder, updateFileRecord, findOrCreateFileFolder, deleteFiles, type FileItem } from '@/services/file-service';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { initializeFirebase } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import Link from 'next/link';


const FLOWCHART_MIMETYPE = 'application/vnd.ogeemo-flowchart+json';
const FLOWCHARTS_FOLDER_NAME = "Flow Charts";

interface FlowchartData {
    userText: string;
    mermaidCode: string;
}

export default function WorkflowChartPage() {
  const [userText, setUserText] = useState('');
  const [mermaidCode, setMermaidCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [savedCharts, setSavedCharts] = useState<FileItem[]>([]);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const [flowchartsFolderId, setFlowchartsFolderId] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<FileItem | null>(null);
  const [chartToDelete, setChartToDelete] = useState<FileItem | null>(null);
  
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newChartName, setNewChartName] = useState('');
  
  const { user } = useAuth();
  const { toast } = useToast();

  const loadCharts = useCallback(async () => {
    if (!user) return;
    setIsLoadingCharts(true);
    try {
        const folder = await findOrCreateFileFolder(user.uid, FLOWCHARTS_FOLDER_NAME);
        setFlowchartsFolderId(folder.id);
        const charts = await getFilesForFolder(user.uid, folder.id);
        setSavedCharts(charts.sort((a,b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()));
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to load charts', description: error.message });
    } finally {
        setIsLoadingCharts(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  const handleGenerateChart = async () => {
    if (!userText.trim()) {
      toast({ variant: 'destructive', title: 'Please enter a description for your workflow.' });
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch('/api/genkit/generate-flowchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: userText }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'The API returned an error.');
      }
      
      const result: GenerateFlowchartOutput = await response.json();
      setMermaidCode(result.mermaidCode);

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to generate chart', description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSave = async () => {
    if (!user || !flowchartsFolderId) return;
    if (!mermaidCode.trim()) {
      toast({ variant: 'destructive', title: 'Cannot save an empty chart. Please generate one first.' });
      return;
    }
    if (!newChartName.trim()) {
      toast({ variant: 'destructive', title: 'Please provide a name for your chart.' });
      setIsSaveDialogOpen(true);
      return;
    }

    const { storage } = await initializeFirebase();
    const chartData: FlowchartData = { userText, mermaidCode };
    const contentBlob = new Blob([JSON.stringify(chartData, null, 2)], { type: FLOWCHART_MIMETYPE });
    
    try {
        if (activeChart) {
             // Update existing file
            const fileRef = storageRef(storage, activeChart.storagePath);
            await uploadBytes(fileRef, contentBlob);
            await updateFileRecord(activeChart.id, {
                name: newChartName,
                size: contentBlob.size,
                modifiedAt: new Date(),
            });
            toast({ title: 'Chart Updated!' });
            setActiveChart(prev => prev ? {...prev, name: newChartName} : null);
        } else {
            // Create new file
            const storagePath = `${user.uid}/${flowchartsFolderId}/${Date.now()}-${newChartName}.json`;
            const fileRef = storageRef(storage, storagePath);
            await uploadBytes(fileRef, contentBlob);
            
            const newFileRecord: Omit<FileItem, 'id'> = {
                name: newChartName,
                type: FLOWCHART_MIMETYPE,
                size: contentBlob.size,
                modifiedAt: new Date(),
                folderId: flowchartsFolderId,
                userId: user.uid,
                storagePath,
            };
            const newChart = await addFileRecord(newFileRecord);
            setActiveChart(newChart);
            toast({ title: 'Chart Saved!' });
        }
        await loadCharts();
        setIsSaveDialogOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  const handleLoadChart = async (chart: FileItem) => {
    try {
        const { storage } = await initializeFirebase();
        const fileRef = storageRef(storage, chart.storagePath);
        const url = await getDownloadURL(fileRef);
        const response = await fetch(url);
        const data: FlowchartData = await response.json();
        
        setUserText(data.userText);
        setMermaidCode(data.mermaidCode);
        setActiveChart(chart);
        setNewChartName(chart.name);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to load chart', description: error.message });
    }
  };
  
  const handleNewChart = () => {
      setActiveChart(null);
      setUserText('');
      setMermaidCode('');
      setNewChartName('');
  };

  const handleConfirmDelete = async () => {
    if (!chartToDelete) return;
    try {
        await deleteFiles([chartToDelete.id]);
        toast({ title: "Chart Deleted" });
        if (activeChart?.id === chartToDelete.id) {
            handleNewChart();
        }
        await loadCharts();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setChartToDelete(null);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6 flex flex-col h-full">
        <header className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold font-headline text-primary">
              AI Workflow Chart Generator
            </h1>
            <Button asChild variant="ghost" size="icon">
                <Link href="/workflow-chart/instructions">
                    <Info className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Instructions</span>
                </Link>
            </Button>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Describe your process in plain text, and let Ogeemo's AI create the flowchart for you.
          </p>
        </header>
        
        <ResizablePanelGroup 
          direction="horizontal"
          className="flex-1 rounded-lg border"
        >
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="flex flex-col h-full p-2">
                <div className="flex items-center justify-between p-2">
                    <h3 className="font-semibold">Saved Charts</h3>
                    <Button size="sm" onClick={handleNewChart}><Plus className="mr-2 h-4 w-4" /> New Chart</Button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="space-y-1 p-2">
                        {isLoadingCharts ? <LoaderCircle className="mx-auto h-6 w-6 animate-spin" /> :
                            savedCharts.map(chart => (
                                <div key={chart.id} className="group flex items-center gap-1 p-2 rounded-md hover:bg-accent cursor-pointer" onClick={() => handleLoadChart(chart)}>
                                    <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                                    <span className="text-sm truncate flex-1">{chart.name}</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setChartToDelete(chart); }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </div>
                            ))
                        }
                    </div>
                </ScrollArea>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={35} minSize={30}>
            <div className="flex flex-col h-full p-4">
              <Label htmlFor="chart-editor" className="text-lg font-semibold mb-2">
                1. Describe Your Process
              </Label>
              <Textarea
                id="chart-editor"
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                className="flex-1 resize-none font-sans text-sm"
                placeholder="e.g., A user logs in. If successful, they see the dashboard. If it fails, they see an error message and can try again."
              />
              <div className="flex items-center gap-2 mt-2">
                  <Button onClick={handleGenerateChart} disabled={isGenerating} className="flex-1">
                      {isGenerating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                      {isGenerating ? 'Generating...' : 'Generate Chart'}
                  </Button>
                  <Button variant="secondary" onClick={() => setIsSaveDialogOpen(true)}><Save className="mr-2 h-4 w-4" /> Save Chart</Button>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={40} minSize={30}>
              <div className="flex flex-col h-full p-4">
                  <h2 className="text-lg font-semibold mb-2">2. Live Preview</h2>
                  <Card className="flex-1">
                      <CardContent className="p-2 h-full flex items-center justify-center">
                          <WorkflowDiagram chart={mermaidCode} />
                      </CardContent>
                  </Card>
              </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{activeChart ? 'Rename & Save Chart' : 'Save New Chart'}</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="chart-name">Chart Name</Label>
            <Input id="chart-name" value={newChartName} onChange={e => setNewChartName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSave() }}/>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!chartToDelete} onOpenChange={() => setChartToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the chart "{chartToDelete?.name}". This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
