'use client';

import { MoreVertical, Plus, LoaderCircle, Trash2, BookOpen, Info, User as UserIcon, Pencil, KeyRound } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useCallback, useMemo } from "react";
import { AddUserDialog } from "./add-user-dialog";
import { ChangePasswordDialog } from "./change-password-dialog";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getUsers, deleteUserProfile, deleteUserProfiles, type UserProfile, updateUserAuth } from '@/services/user-profile-service';
import { format } from "date-fns";
import Link from 'next/link';


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
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);


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
        toast({ title: "User profile deleted", description: "The user's login account has not been affected." });
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

  const handleToggleSelectAll = (checked: boolean) => {
      if (checked) {
          setSelectedUserIds(users.map(u => u.id));
      } else {
          setSelectedUserIds([]);
      }
  };

  const handleToggleSelect = (id: string) => {
      setSelectedUserIds(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleBulkDelete = async () => {
      if (selectedUserIds.length === 0) return;
      setIsLoading(true);
      try {
          await deleteUserProfiles(selectedUserIds);
          toast({ title: "Success", description: `${selectedUserIds.length} profiles removed.` });
          setSelectedUserIds([]);
          await loadUsers();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Bulk Action Failed', description: error.message });
      } finally {
          setIsBulkDeleteAlertOpen(false);
          setIsLoading(false);
      }
  };

  const allSelected = users.length > 0 && selectedUserIds.length === users.length;

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
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Identities & Authority</CardTitle>
              <CardDescription>
                Manage authenticated account nodes across the Spider Web.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                {selectedUserIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedUserIds.length})
                    </Button>
                )}
                <Button onClick={() => setIsAddUserDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
                <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                    <TableHead className="w-12">
                        <Checkbox 
                            checked={allSelected} 
                            onCheckedChange={handleToggleSelectAll} 
                            aria-label="Select all users"
                        />
                    </TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="hidden md:table-cell">
                        Created at
                    </TableHead>
                    <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-primary" />
                            </TableCell>
                        </TableRow>
                    ) : users.length > 0 ? (
                    users.map((userProfile) => (
                        <TableRow key={userProfile.id}>
                        <TableCell>
                            <Checkbox 
                                checked={selectedUserIds.includes(userProfile.id)}
                                onCheckedChange={() => handleToggleSelect(userProfile.id)}
                                aria-label={`Select ${userProfile.displayName}`}
                            />
                        </TableCell>
                        <TableCell className="font-mono text-[10px] uppercase tracking-tighter text-muted-foreground">
                            {userProfile.employeeNumber || userProfile.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-medium">
                            {userProfile.displayName}
                        </TableCell>
                        <TableCell>
                            {userProfile.email}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            {userProfile.createdAt ? format(new Date(userProfile.createdAt.toDate()), 'PP') : 'N/A'}
                        </TableCell>
                        <TableCell>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                aria-haspopup="true"
                                size="icon"
                                variant="ghost"
                                >
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleEdit(userProfile)}>
                                    <Pencil className="mr-2 h-4 w-4"/> Edit Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleChangePassword(userProfile)}>
                                    <KeyRound className="mr-2 h-4 w-4"/> Change Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => handleDelete(userProfile)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4"/> Delete Profile
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                                No identity nodes found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <AddUserDialog 
        isOpen={isAddUserDialogOpen}
        onOpenChange={(open) => {
            setIsAddUserDialogOpen(open);
            if (!open) {
                setUserToEdit(null);
            }
        }}
        onUserAdded={loadUsers}
        userToEdit={userToEdit}
      />
      
      <ChangePasswordDialog
        isOpen={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
        user={userForPasswordChange}
        onPasswordChanged={loadUsers}
      />
      
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will delete the user's profile record from the list. It will not delete their authenticated login account. This action is permanent for the profile data.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">Delete Profile</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Bulk Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                      You are about to delete {selectedUserIds.length} user profile records. Authenticated accounts will be preserved, but operational metadata will be lost. This cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                      Delete All Selected
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
