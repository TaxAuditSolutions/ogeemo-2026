
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatabaseBackup, History, LoaderCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
import { httpsCallable } from "firebase/functions";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/context/auth-context";


type Backup = {
  id: string;
  createdAt: Date;
  status: "Completed" | "Failed";
  size: string;
  description: string;
};

const initialBackups: Backup[] = [
  // Mock data can be replaced with a real fetch from a 'backups' collection
  {
    id: "bkp_1",
    createdAt: new Date(Date.now() - 86400000 * 2),
    status: "Completed",
    size: "256.3 MB",
    description: "Weekly automatic backup",
  },
  {
    id: "bkp_2",
    createdAt: new Date(Date.now() - 86400000 * 9),
    status: "Completed",
    size: "251.8 MB",
    description: "Weekly automatic backup",
  },
];

export function BackupView() {
  const [backups, setBackups] = useState<Backup[]>(initialBackups);
  const [backupStatus, setBackupStatus] = useState<"idle" | "running" | "complete">("idle");
  const [backupToRestore, setBackupToRestore] = useState<Backup | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();
  const { firebaseServices } = useAuth();

  const handleCreateBackup = async () => {
    if (backupStatus === 'running' || !firebaseServices) {
        toast({ variant: "destructive", title: "Error", description: "Firebase services are not available." });
        return;
    }
    setBackupStatus("running");

    try {
      const triggerBackup = httpsCallable(firebaseServices.functions, 'triggerBackup');
      
      const result = await triggerBackup();
      console.log("Cloud Function result:", result.data);

      setBackupStatus("complete");
      toast({
        title: "Backup Initiated",
        description: "The backup process has started successfully. It may take a few minutes to complete.",
      });

    } catch (error: any) {
      console.error("Error calling triggerBackup function:", error);
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: error.message || "An unexpected error occurred while starting the backup.",
        duration: Infinity,
        action: <ToastAction altText="Close">Close</ToastAction>,
      });
      setBackupStatus("idle");
    }
  };

  const handleConfirmRestore = () => {
    if (!backupToRestore) return;

    setIsRestoring(true);
    toast({
        title: "Restore Started",
        description: `This is a placeholder. A real restore would be a complex backend process.`,
    });

    // This remains a simulation as the restore logic is highly specific
    // and requires its own dedicated and secure Cloud Function.
    setTimeout(() => {
        setIsRestoring(false);
        setBackupToRestore(null);
        toast({
            title: "Restore Simulation Complete",
            description: "No data was actually changed.",
        });
    }, 3000);
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold font-headline text-primary">
            Backup Manager
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Secure your application data by creating and managing backups. You can restore your data from any of the saved points.
          </p>
        </header>

        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create a New Backup</CardTitle>
              <CardDescription>
                Trigger a server-side process to create a point-in-time backup of your Firestore database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backupStatus === "running" ? (
                <div className="flex items-center justify-center space-x-2 p-4">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  <p className="text-sm font-medium">Contacting backup service...</p>
                </div>
              ) : backupStatus === "complete" ? (
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex flex-col items-center gap-2">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                      <p className="font-semibold text-green-700 dark:text-green-400">Backup successfully initiated!</p>
                      <p className="text-xs text-muted-foreground">The process is running on the server. Check your Google Cloud Storage bucket for the results.</p>
                      <Button variant="link" size="sm" onClick={() => setBackupStatus('idle')}>Create another backup</Button>
                  </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This process may take several minutes depending on the size of your data. The application will remain available during the backup.
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateBackup} disabled={backupStatus !== "idle"}>
                {backupStatus === "running" ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DatabaseBackup className="mr-2 h-4 w-4" />
                )}
                {backupStatus === 'running' ? 'Initiating...' : 'Create Backup'}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>
                A log of all previous backups. (This is currently mock data).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell>
                          <div className="font-medium">{format(backup.createdAt, "MMM d, yyyy, h:mm a")}</div>
                          <div className="text-xs text-muted-foreground">{backup.description}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              backup.status === "Completed"
                                ? "secondary"
                                : "destructive"
                            }
                            className={
                              backup.status === "Completed" ? "bg-green-100 text-green-800" : ""
                            }
                          >
                            {backup.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="sm" onClick={() => setBackupToRestore(backup)} disabled={backup.status === 'Failed'}>
                             <History className="mr-2 h-4 w-4" /> Restore
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!backupToRestore} onOpenChange={() => setBackupToRestore(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will overwrite all current application data with the data from the backup created on <strong>{backupToRestore ? format(backupToRestore.createdAt, "PPPp") : ""}</strong>. This action cannot be undone.
                    <br/><br/>
                    <strong className="text-destructive">Note: The restore functionality is a placeholder and will not alter your data.</strong>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmRestore} disabled={isRestoring}>
                    {isRestoring && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    {isRestoring ? "Restoring..." : "Yes, Restore Data"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
