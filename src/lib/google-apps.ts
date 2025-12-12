
// @/lib/google-apps.ts
import {
    Calendar,
    MessageSquare, // Using MessageSquare for Chat
    Users,
    FileText,
    Pencil,
    Folder,
    Bot, // Using Bot for Gemini
    Mail,
    Lightbulb,
    Map,
    Video,
    Camera,
    Sheet,
    Presentation, // Using Presentation for Slides
    Globe,
    BookOpen,
    Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface GoogleApp {
    name: string;
    href: string;
    icon: LucideIcon;
}

// Using Lucide icons for consistency
export const allApps: GoogleApp[] = [
    { name: "Calendar", href: "https://calendar.google.com/", icon: Calendar },
    { name: "Chat", href: "https://chat.google.com/", icon: MessageSquare },
    { name: "Contacts", href: "https://contacts.google.com/", icon: Users },
    { name: "Docs", href: "https://docs.google.com/", icon: FileText },
    { name: "Drawings", href: "https://docs.google.com/drawings/", icon: Pencil },
    { name: "Drive", href: "https://drive.google.com/", icon: Folder },
    { name: "Gemini", href: "https://gemini.google.com/app", icon: Bot },
    { name: "Gmail", href: "https://mail.google.com/", icon: Mail },
    { name: "Keep", href: "https://keep.google.com/", icon: Lightbulb },
    { name: "Maps", href: "https://maps.google.com/", icon: Map },
    { name: "Meet", href: "https://meet.google.com/", icon: Video },
    { name: "Text Messages", href: "https://messages.google.com/web/", icon: MessageSquare },
    { name: "Notebook LM", href: "https://notebooklm.google.com/", icon: BookOpen },
    { name: "Photos", href: "https://photos.google.com/", icon: Camera },
    { name: "Sheets", href: "https://sheets.google.com/", icon: Sheet },
    { name: "Sites", href: "https://sites.google.com/", icon: Globe },
    { name: "Slides", href: "https://slides.google.com/", icon: Presentation },
    { name: "Google Search", href: "https://drive.google.com/drive/search?q=", icon: Search },
];
