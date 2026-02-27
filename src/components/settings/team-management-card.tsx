
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
    LoaderCircle, 
    UserPlus, 
    ShieldCheck, 
    ShieldAlert, 
    Shield, 
    Trash2, 
    MoreVertical, 
    UserX,
    Lock,
    Pencil
} from 'lucide-react';
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
      case 'viewer': return <Shield className="h-4 w-4 text-muted-foreground" />;
      case 'none': return <UserX className="h-4 w-4 text-destructive" />;
      default: return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin (Full)';
      case 'editor': return 'Read/Edit';
      case 'viewer': return 'Read Only';
      case 'none': return 'No Access';
      default: return 'Viewer';
    }
  };

  // Allow management if user is admin or if role is not yet set (to avoid lockouts during initial setup)
  const canManageTeam = !currentUserProfile || currentUserProfile.role === 'admin' || !currentUserProfile.role;

  return (
    <Card className="shadow-md">
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
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>User Identity</TableHead>
                  <TableHead>Authority Level</TableHead>
                  <TableHead className="text-right w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((teamUser) => (
                  <TableRow key={teamUser.id} className="group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{teamUser.displayName || 'Unnamed User'}</span>
                        <span className="text-xs text-muted-foreground">{teamUser.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(teamUser.role)}
                        <span className={cn(
                            "text-sm font-medium",
                            teamUser.role === 'none' && "text-destructive font-bold"
                        )}>
                            {getRoleLabel(teamUser.role)}
                        </span>
                        {teamUser.id === user?.uid && (
                            <Badge variant="secondary" className="text-[10px] uppercase ml-2 bg-primary/10 text-primary border-primary/20">You (Owner)</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageTeam && teamUser.id !== user?.uid ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Manage Authority</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Assign Role</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => handleRoleChange(teamUser.id, teamUser.email, 'admin')}>
                              <ShieldAlert className="mr-2 h-4 w-4 text-destructive" /> Admin (Full Orchestration)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleRoleChange(teamUser.id, teamUser.email, 'editor')}>
                              <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Read/Edit (Operational)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleRoleChange(teamUser.id, teamUser.email, 'viewer')}>
                              <Shield className="mr-2 h-4 w-4 text-muted-foreground" /> Read Only (Intelligence)
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleRoleChange(teamUser.id, teamUser.email, 'none')} className="text-destructive">
                              <Lock className="mr-2 h-4 w-4" /> No Access (Revoke)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Member Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : teamUser.id === user?.uid && (
                          <div className="flex justify-end pr-2">
                              <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <ShieldAlert className="h-4 w-4 text-primary opacity-20" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                          <p className="text-xs">Self-management disabled to prevent lockouts.</p>
                                      </TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          </div>
                      )}
                    </TableCell>
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
