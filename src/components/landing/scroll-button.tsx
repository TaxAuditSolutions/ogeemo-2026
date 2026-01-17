
'use client';

import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

export function ScrollButton() {
  const handleScroll = () => {
    const nextSection = document.getElementById('visionaries-section');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <Button variant="link" onClick={handleScroll} className="text-muted-foreground">
        Learn More
        <ChevronDown className="ml-2 h-5 w-5 animate-bounce" />
    </Button>
  );
}
