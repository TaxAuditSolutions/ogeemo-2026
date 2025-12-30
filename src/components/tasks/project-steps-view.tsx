
'use client';

// This component's functionality has been consolidated into the
// `/app/(app)/projects/[projectId]/timeline/page.tsx` file.
// This new page provides a unified view of both the project timeline
// and the task Kanban board.
// This file is now considered obsolete and can be safely removed in a future cleanup.

import { LoaderCircle } from "lucide-react";

export default function ProjectStepsView() {
    return (
        <div className="flex h-full w-full items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4">
                <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading...</p>
            </div>
        </div>
    );
}

