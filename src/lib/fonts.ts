import { Inter, Orbitron } from 'next/font/google';

export const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '600', '700'],
});

export const fontHeadline = Inter({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: ['700'],
});

export const fontOrbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['700'],
});
