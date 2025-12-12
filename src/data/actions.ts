
import {
  Mail,
  Briefcase,
  ListTodo,
  Calendar,
  FileDigit,
  Clock,
  Wand2,
  Contact,
  Beaker,
  Calculator,
  Folder,
  BrainCircuit,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ActionChipData {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  frame: 'quick' | 'more';
}

// This now represents the DEFAULT state for "Your Actions".
export const initialChips: ActionChipData[] = [
  { id: 'chip-1', label: 'OgeeMail', icon: Mail, href: '/ogeemail', frame: 'quick' },
  { id: 'chip-2', label: 'Contacts', icon: Contact, href: '/contacts', frame: 'quick' },
  { id: 'chip-3', label: 'Projects', icon: Briefcase, href: '/projects', frame: 'quick' },
  { id: 'chip-4', label: 'Task & Event Mngr', icon: BrainCircuit, href: '/master-mind', frame: 'quick'},
];
