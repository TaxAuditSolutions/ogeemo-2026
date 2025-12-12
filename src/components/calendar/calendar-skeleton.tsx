
import { LoaderCircle } from "lucide-react";

export function CalendarSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Calendar...</p>
      </div>
    </div>
  );
}
