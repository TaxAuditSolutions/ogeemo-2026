'use client';

import { MoreVertical, Plus, LoaderCircle, Trash2, Pencil, KeyRound, Info } from "lucide-react";
import Link from "next/link";
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
  DropdownMenuSeparator,
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
import { ChangePasswordDialog } from "./change-password-dialog";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getUsers, deleteUserProfile, type UserProfile } from '@/services/user-profile-service';
import { format } from "date-fns";

export function UserListView() {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [userForPasswordChange, setUserForPasswordChange] = useState<UserProfile | null>(null);

  const loadUsers = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
        const fetchedUsers = await getUsers();
        setUsers(fetchedUsers);
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Failed to load users', description: e.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  
  const handleEdit = (user: UserProfile) => {
    setUserToEdit(user);
    setIsAddUserDialogOpen(true);
  };

  const handleDelete = (user: UserProfile) => {
    setUserToDelete(user);
  };
  
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
        await deleteUserProfile(userToDelete.id);
        toast({ title: "User profile deleted" });
        loadUsers();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setUserToDelete(null);
    }
  };

  const handleChangePassword = (user: UserProfile) => {
    setUserForPasswordChange(user);
    setIsChangePasswordOpen(true);
  };

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        <header className="text-center">
            <h1 className="text-3xl font-bold font-headline text-primary">User Manager</h1>
            <p className="text-muted-foreground">Manage the accounts and permissions for your team.</p>
        </header>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center">
                Authenticated Users 
                <Link href="/user-manager/instructions">
                    <Info className="h-4 w-4 ml-2 text-muted-foreground hover:text-primary transition-colors" />
                </Link>
              </CardTitle>
              <CardDescription>
                Review and manage all user profile nodes.
              </CardDescription>
            </div>
            <Button onClick={() => { setUserToEdit(null); setIsAddUserDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
                <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Created at</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center"><LoaderCircle className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
                    ) : users.length > 0 ? (
                    users.map((userProfile) => (
                        <TableRow key={userProfile.id}>
                        <TableCell className="font-mono text-[10px] uppercase tracking-tighter text-muted-foreground">{userProfile.employeeNumber || userProfile.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-medium">{userProfile.displayName}</TableCell>
                        <TableCell>{userProfile.email}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{userProfile.role}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell">{userProfile.createdAt ? format(new Date(userProfile.createdAt.toDate()), 'PP') : 'N/A'}</TableCell>
                        <TableCell>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleEdit(userProfile)}><Pencil className="mr-2 h-4 w-4"/> Edit Profile</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleChangePassword(userProfile)}><KeyRound className="mr-2 h-4 w-4"/> Change Password</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleDelete(userProfile)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete Profile</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">No users found.</TableCell></TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <AddUserDialog isOpen={isAddUserDialogOpen} onOpenChange={(open) => { setIsAddUserDialogOpen(open); if (!open) setUserToEdit(null); }} onUserAdded={loadUsers} userToEdit={userToEdit} />
      <ChangePasswordDialog isOpen={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen} user={userForPasswordChange} onPasswordChanged={loadUsers} />
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete the user's profile record. It will not delete their authenticated login account.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete Profile</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}