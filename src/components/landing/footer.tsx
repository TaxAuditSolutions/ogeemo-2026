'use client';

import Link from "next/link";
import { Logo } from "../logo";
import { useAuth } from "@/context/auth-context";
import { Button } from "../ui/button";

export function SiteFooter() {
    const { user, signInWithGoogle, logout } = useAuth();

    return (
        <footer className="border-t py-6 md:py-8 bg-muted/5">
            <div className="container mx-auto px-4 flex flex-col items-center gap-4 text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} Ogeemo Inc. All rights reserved.</p>
                
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex flex-col items-center gap-2">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest opacity-50">Admin Active: {user?.email}</span>
                                <Button variant="ghost" size="sm" onClick={logout} className="h-6 px-2 text-[10px] uppercase tracking-widest hover:text-primary">
                                    Logout
                                </Button>
                             </div>
                             <Link href="/image-manager" className="text-[10px] uppercase tracking-widest font-bold text-primary hover:underline">
                                Manage Site Images
                             </Link>
                        </div>
                    ) : (
                        <button 
                            onClick={signInWithGoogle}
                            className="text-[10px] uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity"
                        >
                            Admin Login
                        </button>
                    )}
                </div>
            </div>
        </footer>
    )
}
