'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SandboxPage() {
  return (
    <div className="p-4 sm:p-6 flex flex-col items-center h-full">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Testing Time Logs
        </h1>
      </header>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>One Frame to control them all.</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
