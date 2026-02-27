
"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { LogOut, User as UserIcon, Lock, ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserProfile, type UserRole } from '@/services/user-profile-service';
import { Badge } from './ui/badge';

export function UserNav() {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      getUserProfile(user.uid).then(profile => {
        if (profile) {
          if (profile.displayName) setDisplayName(profile.displayName);
          if (profile.role) setRole(profile.role);
        }
      });
    }
  }, [user]);

  if (!user) {
    return null;
  }
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts[0]) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getRoleLabel = (r: UserRole | null) => {
    switch (r) {
      case 'admin': return 'Admin (Full)';
      case 'editor': return 'Read/Edit';
      case 'viewer': return 'Read Only';
      case 'none': return 'No Access';
      default: return 'User';
    }
  };

  const getRoleIcon = (r: UserRole | null) => {
    switch (r) {
      case 'admin': return <ShieldAlert className="h-3 w-3 text-destructive" />;
      case 'editor': return <ShieldCheck className="h-3 w-3 text-primary" />;
      default: return <Shield className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const nameToDisplay = displayName || user.displayName;

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-white/20">
                    <AvatarImage
                        src={user.photoURL || undefined}
                        alt={nameToDisplay || 'User avatar'}
                    />
                    <AvatarFallback>{getInitials(nameToDisplay)}</AvatarFallback>
                </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-bold leading-none">{nameToDisplay || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
              {role && (
                <div className="flex items-center gap-1.5 pt-1.5">
                    {getRoleIcon(role)}
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                        {getRoleLabel(role)}
                    </span>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
             <DropdownMenuItem asChild>
                <Link href="/settings">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                </Link>
            </DropdownMenuItem>
             <DropdownMenuItem asChild>
                <Link href="/change-password">
                    <Lock className="mr-2 h-4 w-4" />
                    <span>Change Password</span>
                </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
           <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
