'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "../logo";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function SiteHeader() {
  const router = useRouter();

  const handleLoginRedirect = () => {
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center" aria-label="Go to Home Page">
            <Logo className="text-black" />
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
                <DropdownMenuItem asChild><Link href="/for-consultants">For Consultants</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/for-accountants">For Accountants</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/for-bookkeepers">For Bookkeepers</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/for-virtual-assistants">For Virtual Assistants</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/for-lawyers">For Lawyers</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/for-paralegals">For Paralegals</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="link" asChild><Link href="/command-centre-info">The Command Centre</Link></Button>
            <Button variant="link" asChild><Link href="/">Members/Mentors</Link></Button>
            <Button variant="link" asChild><Link href="/sarah">Sarah</Link></Button>
            <Button variant="link" asChild><Link href="/pricing">Pricing</Link></Button>
            <Button variant="link" asChild><Link href="/contact">Contact</Link></Button>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
            <Button onClick={handleLoginRedirect} className="font-bold bg-primary text-primary-foreground">
                Login to Ogeemo Suite
            </Button>
        </div>
      </div>
    </header>
  );
}
