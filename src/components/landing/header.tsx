'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "../logo";
import { Button } from "../ui/button";
import { useAuth } from "@/context/auth-context";

export function SiteHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // This handler is now for a general sign-up/register button.
  // If a user is logged in, it will log them out first before redirecting.
  const handleRegisterClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (user) {
      e.preventDefault();
      await logout();
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
            {/* The login button is removed as requested to show a change */}
            <Button asChild variant="secondary">
                <Link href="/register" onClick={handleRegisterClick}>Sign Up</Link>
            </Button>
        </div>
      </div>
    </header>
  );
}
