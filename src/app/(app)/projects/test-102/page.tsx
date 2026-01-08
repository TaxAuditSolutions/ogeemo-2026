
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { addProject } from '@/services/project-service';

export default function Test102Page() {
  const [projectName, setProjectName] = useState('');
  const [testInfo, setTestInfo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleSave = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create a project.' });
        return;
    }
    if (!projectName.trim()) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Project Name is required.' });
        return;
    }

    setIsSaving(true);
    try {
        await addProject({
            name: projectName,
            description: '',
            status: 'planning',
            userId: user.uid,
            createdAt: new Date(),
            testPField: testInfo,
        });
        toast({ title: 'Project Created', description: `"${projectName}" has been added.` });
        router.push('/projects/all');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Test 102
        </h1>
        <Button asChild variant="outline">
          <Link href="/projects/all">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project List
          </Link>
        </Button>
      </header>
      <div className="p-8 border-2 border-dashed rounded-lg max-w-lg mx-auto">
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input 
                    id="project-name" 
                    placeholder="Enter project name..." 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="test-info">Test info</Label>
                <Input 
                    id="test-info" 
                    placeholder="Enter test info..."
                    value={testInfo}
                    onChange={(e) => setTestInfo(e.target.value)}
                />
            </div>
            <div className="pt-4 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Project
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
