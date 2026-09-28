'use client';

import Image from 'next/image';
import { cn } from "@/lib/utils";
import { fontOrbitron } from '@/lib/fonts';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Renders only the logo mark (no wordmark) — for places where the name appears alongside. */
  iconOnly?: boolean;
  /** Pixel size of the logo mark (width & height). Default 32. */
  markSize?: number;
}

/**
 * @fileOverview The Ogeemo brand logo component.
 * Configurable via className. Automatically inverts the icon for white text themes.
 */
export function Logo({ className, iconOnly = false, markSize = 32, ...props }: LogoProps) {
  const isWhite = className?.includes('text-white');

  return (
    <div 
      className={cn("flex items-center gap-2", className)} 
      {...props}
    >
      <Image 
        src="/images/Ogeemo-Logo-BonT.png" 
        alt="Ogeemo logo" 
        width={markSize} 
        height={markSize} 
        quality={100}
        className={cn(isWhite && "brightness-0 invert")}
      />
      {!iconOnly && (
        <h1 className={cn(
            fontOrbitron.variable,
            "font-orbitron font-bold text-2xl tracking-wider uppercase"
        )}>
            OGEEMO
        </h1>
      )}
    </div>
  );
}
