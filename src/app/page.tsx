'use client';

import { AboutContent } from '@/components/landing/about-content';

/**
 * @fileOverview The root landing page.
 * Displays the About content as the home page.
 * No automatic redirection to allow users to see the marketing site.
 */
export default function Home() {
  return <AboutContent />;
}
