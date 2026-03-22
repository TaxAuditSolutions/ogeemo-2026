
"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { LogOut, User as UserIcon, Lock, ShieldAlert, ShieldCheck, Shield, Award } from "lucide-react";
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
import { cn } from '@/lib/utils';

export function UserNav() {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isCertified, setIsCertified] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      getUserProfile(user.uid).then(profile => {
        if (profile) {
          if (profile.displayName) setDisplayName(profile.displayName);
          if (profile.role) setRole(profile.role);
          setIsCertified(!!profile.is_mentor_certified);
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
      case 'Certified_Mentor': return 'Certified Mentor';
      case 'Mentor_Apprentice': return 'Mentor Apprentice';
      case 'Apprentice': return 'Apprentice';
      case 'admin': return 'Admin';
      default: return 'Member';
    }
  };

  const getRoleIcon = (r: UserRole | null) => {
    switch (r) {
      case 'Certified_Mentor': return <Award className="h-3 w-3 text-yellow-500 fill-yellow-500" />;
      case 'Mentor_Apprentice': return <ShieldCheck className="h-3 w-3 text-primary" />;
      case 'admin': return <ShieldAlert className="h-3 w-3 text-destructive" />;
      default: return <Shield className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const nameToDisplay = displayName || user.displayName;

  return (
    <div className="flex items-center gap-3">
        {isCertified && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600">
                <Award className="h-3.5 w-3.5 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest">Mentor's Seal</span>
            </div>
        )}
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
                <div className="flex items-center gap-2">
                    <p className="text-sm font-bold leading-none">{nameToDisplay || "User"}</p>
                    {isCertified && <Award className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                </div>
                <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                </p>
                {role && (
                    <div className="flex items-center gap-1.5 pt-1.5">
                        {getRoleIcon(role)}
                        <span className={cn(
                            "text-[10px] uppercase font-bold tracking-widest",
                            role === 'Certified_Mentor' ? "text-yellow-600" : "text-muted-foreground"
                        )}>
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
    </div>
  );
}
