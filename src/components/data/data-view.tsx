
'use client';

import { MoreVertical, Plus, LoaderCircle, Trash2, BookOpen, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect, useCallback } from "react";
import { AddUserDialog } from "./add-user-dialog";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getFilesForFolder, findOrCreateFileFolder, type FileItem, deleteFiles, getFileById } from "@/services/file-service";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from 'next/link';


export function UserListView() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [userFiles, setUserFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [fileToEdit, setFileToEdit] = useState<FileItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const loadUserFiles = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
        const usersFolder = await findOrCreateFileFolder(user.uid, 'Users');
        const files = await getFilesForFolder(user.uid, usersFolder.id);
        setUserFiles(files);
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Failed to load users', description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadUserFiles();
  }, [loadUserFiles]);
  
  const handleEdit = async (file: FileItem) => {
    setIsLoadingFile(true);
    try {
      // Fetch the full file content before opening the dialog
      const fullFile = await getFileById(file.id);
      if (fullFile) {
        setFileToEdit(fullFile);
        setIsAddUserDialogOpen(true);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find user details.' });
      }
    } catch (error: any) {
       toast({ variant: 'destructive', title: 'Error', description: `Failed to load user: ${error.message}` });
    } finally {
        setIsLoadingFile(false);
    }
  };

  const handleDelete = (file: FileItem) => {
    setFileToDelete(file);
  };
  
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    try {
        await deleteFiles([fileToDelete.id]);
        toast({ title: "User file deleted" });
        loadUserFiles();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setFileToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        <header className="text-center relative">
            <h1 className="text-3xl font-bold font-headline text-primary text-center">User List</h1>
            <div className="absolute top-0 right-0">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/user-list/instructions">
                        <Info className="h-5 w-5" />
                        <span className="sr-only">About the User List</span>
                    </Link>
                </Button>
            </div>
        </header>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                A list of users in your database.
              </CardDescription>
            </div>
            <Button onClick={() => { setFileToEdit(null); setIsAddUserDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Created at
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            <LoaderCircle className="mx-auto h-6 w-6 animate-spin" />
                        </TableCell>
                    </TableRow>
                ) : userFiles.length > 0 ? (
                  userFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        {file.name.replace('.txt', '')}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {format(file.modifiedAt, 'PP')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                              disabled={isLoadingFile}
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleEdit(file)}>
                                <BookOpen className="mr-2 h-4 w-4"/> Open / Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDelete(file)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4"/> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            No users found.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AddUserDialog 
        isOpen={isAddUserDialogOpen}
        onOpenChange={(open) => {
            setIsAddUserDialogOpen(open);
            if (!open) {
                setFileToEdit(null); // Clear editing state when dialog closes
            }
        }}
        onUserAdded={loadUserFiles}
        userToEdit={fileToEdit}
      />
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the user file for "{fileToDelete?.name.replace('.txt', '')}". This cannot be undone.</AlertDialogDescription>
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
