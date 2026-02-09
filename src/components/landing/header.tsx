
'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "../logo";
import { Button } from "../ui/button";
import { useAuth } from "@/context/auth-context";
import { UserNav } from "../user-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LayoutDashboard } from "lucide-react";

export function SiteHeader() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/action-manager" className="flex items-center" aria-label="Go to Action Manager">
            <Logo />
          </Link>
        </div>
        <nav className="flex flex-1 items-center space-x-1">
            <Button variant="link" asChild><Link href="/features">Features</Link></Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="link">
                  Solutions <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild><Link href="/for-small-businesses">For Small Businesses</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/for-accountants">For Accountants</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/for-bookkeepers">For Bookkeepers</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/for-virtual-assistants">For Virtual Assistants</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/for-lawyers">For Lawyers</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/for-paralegals">For Paralegals</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="link" asChild><Link href="/about">About</Link></Button>
            <Button variant="link" asChild><Link href="/contact">Contact</Link></Button>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
            {user ? (
                <div className="flex items-center gap-4">
                    <Button asChild className="hidden sm:flex">
                        <Link href="/action-manager">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Action Manager
                        </Link>
                    </Button>
                    <UserNav />
                </div>
            ) : (
                <Button onClick={() => router.push('/login')}>Login</Button>
            )}
        </div>
      </div>
    </header>
  );
}
