'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestingPage() {
  const result = 1 + 1;

  return (
    <div className="flex items-center justify-center h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Capability Test</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg">One plus one is <span className="font-bold text-primary">{result}</span>.</p>
          <p className="text-sm text-muted-foreground mt-2">The system is operational and ready for your commands.</p>
        </CardContent>
      </Card>
    </div>
  );
}
