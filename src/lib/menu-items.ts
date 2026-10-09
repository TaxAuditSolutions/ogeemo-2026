import {
  LayoutDashboard,
  Users,
  Briefcase,
  Info,
  FileText,
  Calendar,
  Contact,
  Clock,
  Folder,
  Lightbulb,
  Settings,
  HeartPulse,
  Wand2,
  Megaphone,
  PackageSearch,
  Users2,
  ListChecks,
  Search,
  Image,
  Database,
  PlayCircle,
  UserCog,
  ClipboardList,
  ClipboardCheck,
  Crown,
  Building2,
  StickyNote,
  Inbox
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { accountingMenuItems } from '@/data/accounting-menu-items';
import hrMenuItems from '@/data/hr-menu-items';

export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  masterTenantOnly?: boolean;
}

export const allMenuItems: MenuItem[] = [
  { href: "/action-manager", label: "My Shortcuts", icon: LayoutDashboard },
  { href: "/event-manager", label: "Activity Manager", icon: PlayCircle },
  { href: "/action-manager/manage", label: "Customize My Shortcuts", icon: LayoutDashboard },
  { href: "/hr-manager", label: "HR Hub", icon: Users2 },
  { href: "/crm/plan", label: "CRM Hub", icon: Users2 },
  { href: "/inventory-manager/track", label: "Inventory", icon: PackageSearch },
  { href: "/marketing-manager", label: "Marketing", icon: Megaphone },
  { href: "/google", label: "Google Apps", icon: Wand2 },
  { href: "/hytexercise", label: "Hytexercise", icon: HeartPulse },
  { href: "/tools/image-generator", label: "Image Generator", icon: Wand2 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/image-manager", label: "Image Manager", icon: Image },
  { href: "/backup", label: "Backups", icon: Database },
  { href: "/user-manager", label: "User Manager", icon: UserCog, adminOnly: true },
  { href: "/owner", label: "Ogeemo Owner", icon: Crown, masterTenantOnly: true },
  { href: "/tenant-manager", label: "Tenant Manager", icon: Building2, masterTenantOnly: true },
  { href: "/inquiries", label: "Inquiries", icon: Inbox, adminOnly: true },
  { href: "/contacts", label: "Contacts Hub", icon: Contact },
  { href: "/projects/all", label: "Projects", icon: Briefcase },
  { href: "/project-status", label: "Project Status", icon: ClipboardCheck },
  { href: "/to-do", label: "To-Do List", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/document-manager", label: "Document Manager", icon: Folder },
  { href: "/user-notes", label: "User Notes", icon: StickyNote },
  { href: "/meetings", label: "Meetings", icon: Users },
  { href: "/idea-board", label: "Idea Board", icon: Lightbulb },
  { href: "/reports", label: "Reports Hub", icon: ClipboardList },
  { href: "/reports/work-activity", label: "Work Activity Summary", icon: ClipboardList },
  { href: "/reports/client-statement", label: "Client Statement", icon: FileText },
  { href: "/reports/time-log", label: "Worker Time Log Report", icon: Clock },
  { href: "/reports/client-time-log", label: "Client Time Log Report", icon: Clock },
  { href: "/reports/search", label: "Advanced Search", icon: Search },
  { href: "/feedback", label: "Feedback", icon: Megaphone },
  ...accountingMenuItems,
  ...hrMenuItems,
];

/**
 * Core daily-workflow destinations (beta default Workspace), in workflow
 * order: customer -> project -> work/activity -> schedule -> recorded time.
 *
 * Beta feedback: the default Workspace should mirror the user's business
 * workflow, not Ogeemo's internal module categories (e.g. Contacts buried
 * under "Relationships"). Coordination: OG-065 (which destinations are
 * surfaced by default) and OG-035 (the navigation/default Groups mechanism).
 * Named constant so it can later seed a selectable workflow preset;
 * personalization always wins over defaults.
 */
export const CORE_WORKFLOW_DESTINATIONS = [
    '/contacts',
    '/projects/all',
    '/event-manager',
    '/calendar',
    '/reports/time-log',
];

/**
 * Default items of the sidebar's Workspace group: the core workflow first,
 * then personal/workspace extras (To-Do, Documents, Notes and Meetings exist
 * in no other group, so they must stay here).
 */
export const WORKSPACE_GROUP_ITEMS = [
    ...CORE_WORKFLOW_DESTINATIONS,
    '/action-manager',
    '/to-do',
    '/document-manager',
    '/user-notes',
    '/meetings',
];