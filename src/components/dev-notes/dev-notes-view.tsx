
"use client";

import { FilesView } from "@/components/files/files-view";

// The Dev Notes Hub uses the same robust File Manager component,
// but in a real-world scenario, it could be configured to point
// to a specific, secure root folder like 'dev-notes'.
export function DevNotesView() {
  return <FilesView />;
}
