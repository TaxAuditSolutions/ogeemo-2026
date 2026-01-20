
"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { LogOut, User as UserIcon, Lock } from "lucide-react";
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
import { getUserProfile } from '@/services/user-profile-service';

export function UserNav() {
  const { user, logout } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    // Set a default name immediately, then fetch the more accurate one.
    if (user) {
      setDisplayName(user.displayName);
      getUserProfile(user.uid).then(profile => {
        if (profile?.displayName) {
          setDisplayName(profile.displayName);
        }
      });
    }
  }, [user]);

  if (!user) {
    return null;
  }
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    // Use a simple space split which is more reliable.
    const parts = name.trim().split(' ').filter(Boolean);
    
    if (parts.length > 1) {
        // For names like "Dan White", this will correctly return "DW"
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    
    // Fallback for single names
    if (parts[0]) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return 'U';
  };

  const nameToDisplay = displayName || user.displayName;

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-9 w-9">
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
              <p className="text-sm font-medium leading-none">{nameToDisplay || "User"}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
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
           <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
