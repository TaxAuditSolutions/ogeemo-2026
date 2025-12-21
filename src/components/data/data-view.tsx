
'use client';

import { MoreHorizontal, Plus } from "lucide-react";
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
import { getFilesForFolder, findOrCreateFileFolder, type FileItem } from "@/services/file-service";
import { format } from "date-fns";
import { LoaderCircle } from "lucide-react";

export function UserListView() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [userFiles, setUserFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

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

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        <h1 className="text-3xl font-bold font-headline text-primary text-center">User List</h1>
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>Users Collection</CardTitle>
              <CardDescription>
                A list of users in your database.
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddUserDialogOpen(true)}>
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
                        <div className="font-medium">{file.name.replace('.txt', '')}</div>
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
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Delete</DropdownMenuItem>
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
        onOpenChange={setIsAddUserDialogOpen}
        onUserAdded={loadUserFiles}
      />
    </>
  );
}
