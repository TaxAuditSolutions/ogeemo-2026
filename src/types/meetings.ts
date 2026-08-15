export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  durationMinutes?: number;
}

export interface Meeting {
  id: string;
  orgId?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  title: string;
  description?: string;
  date: Date | null;
  attendees?: string[];
  agendaItems: AgendaItem[];
  isScheduledToCalendar: boolean;
  taskId?: string; // ID of the calendar task if scheduled
}