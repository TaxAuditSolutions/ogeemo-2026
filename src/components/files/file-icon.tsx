
"use client";

import { FileText, FileImage, FileAudio, FileVideo, FileArchive, Table2, FileCode2, FileQuestion, Presentation, Sheet, Link as LinkIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FileIconProps {
  fileType: string;
}

const mimeTypeToIcon: { [key: string]: LucideIcon } = {
  // Text
  "text/plain": FileText,
  "text/html": FileCode2,
  "text/css": FileCode2,
  "text/javascript": FileCode2,
  "application/json": FileCode2,
  "application/pdf": FileText,
  // Images
  "image/jpeg": FileImage,
  "image/png": FileImage,
  "image/gif": FileImage,
  "image/svg+xml": FileImage,
  // Audio
  "audio/mpeg": FileAudio,
  "audio/wav": FileAudio,
  // Video
  "video/mp4": FileVideo,
  "video/webm": FileVideo,
  // Archives
  "application/zip": FileArchive,
  "application/x-rar-compressed": FileArchive,
  // Spreadsheets
  "application/vnd.ms-excel": Table2,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": Table2,
  // Ogeemo Custom Types
  "application/vnd.og-report-template+html": FileText,
  // Google Drive Link Types
  "url-link": LinkIcon,
  "google-drive-link": LinkIcon,
  "doc": FileText,
  "sheet": Sheet,
  "slide": Presentation,
};


export function FileIcon({ fileType }: FileIconProps) {
  const Icon = mimeTypeToIcon[fileType] || FileQuestion;
  return <Icon className="h-5 w-5 text-muted-foreground" />;
}
