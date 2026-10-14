

import type { LucideIcon } from 'lucide-react';
import type { DurationSource } from '@/lib/duration-source';

export type TaskStatus = 'todo' | 'inProgress' | 'done';

export interface TimeSession {
  id: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  notes?: string;
}

export interface Event {
  id: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  title: string;
  description?: string;
  start?: Date;
  end?: Date;
  status: TaskStatus;
  position: number;
  projectId?: string | null;
  stepId?: string | null;
  userId: string;
  attendees?: string[];
  contactId?: string | null;
  workerId?: string | null; // Added for payroll tracking
  isScheduled?: boolean;
  isTodoItem?: boolean;
  duration?: number; // in seconds, CUMULATIVE total
  // Provenance of `duration`: actual sessions vs planned schedule span vs manual entry.
  // Null/undefined on legacy docs - readers fall back to resolveDurationSource().
  durationSource?: DurationSource | null;
  isBillable?: boolean;
  billableRate?: number; // rate per hour
  sessions?: TimeSession[];
  // Billing state (OG-070): set when this Activity is placed on an invoice,
  // cleared when that invoice is deleted or the entry is removed from it.
  billedInvoiceId?: string | null;
  billedAt?: Date | null;
  urgency?: ProjectUrgency;
  importance?: ProjectImportance;
  ritualType?: 'daily' | 'weekly';
  workOrderId?: string | null;
}

export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed';
export type ProjectImportance = 'A' | 'B' | 'C';
export type ProjectUrgency = 'urgent' | 'important' | 'optional';

export interface Project {
  id: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  name: string;
  description?: string;
  clientId?: string | null;
  contactId?: string | null;
  userId: string;
  steps?: Partial<ProjectStep>[];
  status?: ProjectStatus;
  importance?: ProjectImportance;
  urgency?: ProjectUrgency;
  projectManagerId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  projectValue?: number | null;
}

export interface ProjectStep {
  id: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  isBillable: boolean;
  connectToCalendar: boolean;
  startTime: Date | null;
  isCompleted: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  tasks: Omit<Event, 'id' | 'projectId' | 'userId'>[];
  userId: string;
}

export interface ProjectFolder {
  id: string;
  name: string;
  parentId?: string | null;
  userId: string;
}

export interface ActionChipData {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string | { pathname: string; query?: { [key: string]: string } };
  userId: string;
}

export interface StoredTimerState {
  eventId: string;
  notes: string;
  isActive: boolean;
  isPaused: boolean;
  startTime: number;
  pauseTime: number | null;
  totalPausedDuration: number;
}

export interface Idea {
  id: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  title: string;
  description?: string;
  status: 'Yes' | 'No' | 'Maybe';
  position: number;
  userId: string;
}
