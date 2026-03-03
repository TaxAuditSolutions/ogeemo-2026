'use client';

import Image from 'next/image';
import { cn } from "@/lib/utils";
import { fontOrbitron } from '@/app/layout';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {}

// The Logo is now a simple display component.
// Navigation is handled by wrapping it in a <Link> component where it's used.
export function Logo({ className, ...props }: LogoProps) {
  return (
    <div 
      className={cn("flex items-center gap-2", className)} 
      {...props}
    >
      <Image src="/images/Ogeemo-Logo-BonT.png" alt="Ogeemo logo" width={32} height={32} />
      <h1 className={cn(
          fontOrbitron.variable,
          "font-headline font-bold text-2xl tracking-wider text-white uppercase"
      )}>
          OGEEMO
      </h1>
    </div>
  );
}
