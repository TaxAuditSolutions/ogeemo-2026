'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "../logo";
import { Button } from "../ui/button";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function SiteHeader() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const handleAction = () => {
    if (user) {
      router.push("/welcome");
    } else {
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center" aria-label="Go to Home Page">
            <Logo className="text-black" />
          </Link>
        </div>
        <nav className="flex flex-1 items-center space-x-1 overflow-x-auto no-scrollbar">
            <Button variant="link" asChild className="shrink-0"><Link href="/features">Features</Link></Button>
            
            <Button variant="link" asChild className="shrink-0"><Link href="/solutions">Solutions</Link></Button>

            <Button variant="link" asChild className="shrink-0"><Link href="/about">About</Link></Button>
            <Button variant="link" asChild className="shrink-0"><Link href="/pricing">Members</Link></Button>
            <Button variant="link" asChild className="shrink-0"><Link href="/partners">Partners</Link></Button>
            <Button variant="link" asChild className="shrink-0"><Link href="/pricing">Pricing</Link></Button>
            <Button variant="link" asChild className="shrink-0"><Link href="/contact">Contact</Link></Button>
        </nav>
        <div className="flex items-center justify-end space-x-4 ml-4">
            {!isLoading && (
              <Button onClick={handleAction} className="font-bold bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all">
                  {user ? "Go to Ogeemo Suite" : "Login to Ogeemo Suite"}
              </Button>
            )}
        </div>
      </div>
    </header>
  );
}
