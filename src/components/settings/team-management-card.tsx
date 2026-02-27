'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoaderCircle, UserPlus, ShieldCheck, ShieldAlert, Shield, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getUsers, updateUserProfile, type UserProfile, type UserRole } from '@/services/user-profile-service';
import { AddUserDialog } from '@/components/data/add-user-dialog';

export function TeamManagementCard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTeam = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const allUsers = await getUsers();
      setUsers(allUsers);
      const myProfile = allUsers.find(u => u.id === user.uid) || null;
      setCurrentUserProfile(myProfile);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Load Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleRoleChange = async (userId: string, email: string, newRole: UserRole) => {
    if (!user) return;
    
    // Optimistic update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));

    try {
      await updateUserProfile(userId, email, { role: newRole });
      toast({ title: 'Authority Updated', description: `User access level changed to ${newRole}.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
      loadTeam(); // Revert on failure
    }
  };

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case 'admin': return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'editor': return <ShieldCheck className="h-4 w-4 text-primary" />;
      default: return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin (Full)';
      case 'editor': return 'Read/Edit';
      case 'viewer': return 'Read Only';
      default: return 'Viewer';
    }
  };

  // Allow management if user is admin OR if role is not set yet (first user setup)
  const canManageTeam = !currentUserProfile || currentUserProfile.role === 'admin' || !currentUserProfile.role;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Team & Authority</CardTitle>
          <CardDescription>Manage user access levels across the Spider Web.</CardDescription>
        </div>
        {canManageTeam && (
          <Button size="sm" onClick={() => setIsAddUserOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Add Member
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Authority Level</TableHead>
                  {canManageTeam && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((teamUser) => (
                  <TableRow key={teamUser.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{teamUser.displayName || 'Unnamed User'}</span>
                        <span className="text-xs text-muted-foreground">{teamUser.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManageTeam && teamUser.id !== user?.uid ? (
                        <Select 
                          value={teamUser.role || 'viewer'} 
                          onValueChange={(val: UserRole) => handleRoleChange(teamUser.id, teamUser.email, val)}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin (Full)</SelectItem>
                            <SelectItem value="editor">Read/Edit</SelectItem>
                            <SelectItem value="viewer">Read Only</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getRoleIcon(teamUser.role)}
                          <span className="text-sm font-medium">{getRoleLabel(teamUser.role)}</span>
                          {teamUser.id === user?.uid && <Badge variant="outline" className="text-[10px] uppercase ml-2">You</Badge>}
                        </div>
                      )}
                    </TableCell>
                    {canManageTeam && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={teamUser.id === user?.uid}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      <AddUserDialog 
        isOpen={isAddUserOpen} 
        onOpenChange={setIsAddUserOpen} 
        onUserAdded={loadTeam} 
        userToEdit={null} 
      />
    </Card>
  );
}
