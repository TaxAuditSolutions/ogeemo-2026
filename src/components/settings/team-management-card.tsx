
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
  Pencil,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getUsers, type UserProfile, type AccessLevel } from '@/core/user-profile-service';
import { updateUserAccess, removeUser } from '@/app/actions/org-actions';
import { getAssignableRoles, canAccessUserManager } from '@/core/rbac';
import { AddUserDialog } from '@/components/data/add-user-dialog';
import { InviteUserDialog } from '@/components/settings/invite-user-dialog';
import { ChangePasswordDialog } from '@/components/data/change-password-dialog';
import { cn } from '@/lib/utils';

export function TeamManagementCard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [userForPasswordChange, setUserForPasswordChange] = useState<UserProfile | null>(null);

  const { user, isMasterTenant } = useAuth();
  const { toast } = useToast();

  const loadTeam = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const myProfile = await import('@/core/user-profile-service').then(m => m.getUserProfile(user.uid));
      setCurrentUserProfile(myProfile);

      if (myProfile?.orgId) {
        const orgUsers = await getUsers(myProfile.orgId);
        setUsers(orgUsers);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Load Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleRoleChange = async (userId: string, email: string, newRole: AccessLevel | 'none') => {
    if (!user) return;

    // Optimistic UI update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, accessLevel: newRole === 'none' ? undefined : newRole } : u));

    try {
      await updateUserAccess({ targetUid: userId, newRole });
      toast({ title: 'Authority Updated', description: `User access level changed to ${newRole}.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
      loadTeam(); // Revert on failure
    }
  };

  const handleEditUser = (targetUser: UserProfile) => {
    setUserToEdit(targetUser);
    setIsAddUserOpen(true);
  };

  const handleChangePassword = (targetUser: UserProfile) => {
    setUserForPasswordChange(targetUser);
    setIsChangePasswordOpen(true);
  };

  const handleDeleteMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user profile? The user's login account will remain but they will lose access to this workspace.")) return;

    try {
      await removeUser(userId);
      toast({ title: "Member Removed", description: "The user profile has been deleted." });
      loadTeam();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Removal Failed', description: error.message });
    }
  };

  const getRoleIcon = (role?: AccessLevel | 'none') => {
    switch (role) {
      case 'super_admin': return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'org_admin': return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'editor': return <ShieldCheck className="h-4 w-4 text-primary" />;
      case 'viewer': return <Shield className="h-4 w-4 text-muted-foreground" />;
      case 'none': return <UserX className="h-4 w-4 text-destructive" />;
      default: return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role?: AccessLevel | 'none') => {
    switch (role) {
      case 'super_admin': return 'Super Admin (Master Tenant)';
      case 'org_admin': return 'Admin (Full)';
      case 'editor': return 'Read/Edit';
      case 'viewer': return 'Read Only';
      case 'none': return 'No Access';
      default: return 'Viewer';
    }
  };

  // Resilient access check: If the user is the only one in the list, or we have an admin profile, allow management.
  const canManageTeam = canAccessUserManager(currentUserProfile?.accessLevel) || users.length === 0;
  const canInvite = canManageTeam || currentUserProfile?.accessLevel === 'editor';
  const assignableRoles = getAssignableRoles(currentUserProfile?.accessLevel, isMasterTenant);

  return (
    <>
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Team & Authority</CardTitle>
            <CardDescription>Manage user access levels across the Spider Web.</CardDescription>
          </div>
          {canInvite && (
            <Button size="sm" onClick={() => setIsInviteUserOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Invite User
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
                          {getRoleIcon(teamUser.accessLevel || 'none')}
                          <span className={cn(
                            "text-sm font-medium",
                            !teamUser.accessLevel && "text-destructive font-bold"
                          )}>
                            {getRoleLabel(teamUser.accessLevel || 'none')}
                          </span>
                          {teamUser.id === user?.uid && (
                            <Badge variant="secondary" className="text-[10px] uppercase ml-2 bg-primary/10 text-primary border-primary/20">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {(canManageTeam || teamUser.id === user?.uid) ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Manage Authority</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">User Management</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => handleEditUser(teamUser)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Profile Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleChangePassword(teamUser)}>
                                <KeyRound className="mr-2 h-4 w-4" /> Change Password
                              </DropdownMenuItem>

                              {canManageTeam && teamUser.id !== user?.uid && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Assign Role</DropdownMenuLabel>
                                  {assignableRoles.map((role) => (
                                    <DropdownMenuItem key={role} onSelect={() => handleRoleChange(teamUser.id, teamUser.email, role)}>
                                      {getRoleIcon(role)}
                                      <span className="ml-2">{getRoleLabel(role)}</span>
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuItem onSelect={() => handleRoleChange(teamUser.id, teamUser.email, 'none')} className="text-destructive">
                                    <Lock className="mr-2 h-4 w-4" /> No Access (Revoked)
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteMember(teamUser.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Member Record
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddUserDialog
        isOpen={isAddUserOpen}
        onOpenChange={(open) => {
          setIsAddUserOpen(open);
          if (!open) setUserToEdit(null);
        }}
        onUserAdded={loadTeam}
        userToEdit={userToEdit}
      />

      <InviteUserDialog
        isOpen={isInviteUserOpen}
        onOpenChange={setIsInviteUserOpen}
        onUserInvited={loadTeam}
        currentUserProfile={currentUserProfile}
      />

      <ChangePasswordDialog
        isOpen={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
        user={userForPasswordChange}
        onPasswordChanged={loadTeam}
      />
    </>
  );
}
