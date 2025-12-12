'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "../logo";
import { Button } from "../ui/button";
import { useAuth } from "@/context/auth-context";

export function SiteHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleRegisterClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user) {
      e.preventDefault();
      await logout();
      // After logout, the AuthProvider will handle the redirect, but we can push here for faster navigation.
      router.push('/register');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary/95 text-primary-foreground backdrop-blur supports-[backdrop-filter]:bg-primary/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
           <Button asChild variant="secondary">
                <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="secondary">
                <Link href="/register" onClick={handleRegisterClick}>Become a Beta Tester</Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
