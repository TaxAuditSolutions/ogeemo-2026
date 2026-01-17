
'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "../logo";
import { Button } from "../ui/button";
import { useAuth } from "@/context/auth-context";
import { UserNav } from "../user-nav";

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
        <nav className="flex flex-1 items-center space-x-2">
            <Button variant="link" asChild><Link href="/explore">Explore Features</Link></Button>
            <Button variant="link" asChild><Link href="/for-small-businesses">For Small Businesses</Link></Button>
            <Button variant="link" asChild><Link href="/for-accountants">For Accountants</Link></Button>
            <Button variant="link" asChild><Link href="/news">News</Link></Button>
            <Button variant="link" asChild><Link href="/about">About</Link></Button>
            <Button variant="link" asChild><Link href="/contact">Contact</Link></Button>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
            {user ? (
                <UserNav />
            ) : (
                <Button onClick={() => router.push('/login')}>Login</Button>
            )}
        </div>
      </div>
    </header>
  );
}
