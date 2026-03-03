'use client';

import Image from 'next/image';
import { cn } from "@/lib/utils";
import { fontOrbitron } from '@/app/layout';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * @fileOverview The Ogeemo brand logo component.
 * Configurable via className. Automatically inverts the icon for white text themes.
 */
export function Logo({ className, ...props }: LogoProps) {
  const isWhite = className?.includes('text-white');

  return (
    <div 
      className={cn("flex items-center gap-2", className)} 
      {...props}
    >
      <Image 
        src="/images/Ogeemo-Logo-BonT.png" 
        alt="Ogeemo logo" 
        width={32} 
        height={32} 
        className={cn(isWhite && "brightness-0 invert")}
      />
      <h1 className={cn(
          fontOrbitron.variable,
          "font-headline font-bold text-2xl tracking-wider uppercase"
      )}>
          OGEEMO
      </h1>
    </div>
  );
}
