
'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { fontOrbitron } from '@/app/layout';
import { useAuth } from '@/context/auth-context';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Logo({ className, ...props }: LogoProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogoClick = async () => {
    if (user) {
      // The logout function now handles the redirect, so we just call it.
      await logout();
    } else {
      // If there's no user, we are on a public page, so just go to login.
      router.push('/login');
    }
  };
  
  return (
    <div 
      onClick={handleLogoClick} 
      className={cn("flex items-center gap-2 cursor-pointer", className)} 
      aria-label="Go to Ogeemo login page"
      {...props}
    >
      <Image src="/images/Ogeemo-Logo-BonT.png" alt="Ogeemo logo" width={32} height={32} />
      <h1 className={cn(
          fontOrbitron.variable,
          "font-headline font-bold text-2xl tracking-wider text-black uppercase"
      )}>
          OGEEMO
      </h1>
    </div>
  );
}
