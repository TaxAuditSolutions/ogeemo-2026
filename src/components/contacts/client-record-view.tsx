'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format, startOfDay, endOfDay, isFuture, isToday, isYesterday } from 'date-fns';
import {
  ArrowLeft,
  Briefcase,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileDigit,
  Files,
  FolderOpen,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ContactFormDialog from '@/components/contacts/contact-form-dialog';
import { getContactById, type Contact } from '@/services/contact-service';
import { getFolders as getContactFolders, type FolderData } from '@/services/contact-folder-service';
import {
  getTasksForUser,
  getProjects,
  type Event as TaskEvent,
  type Project,
} from '@/services/project-service';
import { getInvoices, getCompanies, type Invoice, type Company } from '@/core/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

/**
 * @fileOverview The client record ("Sarah Mitchell" screen): one consolidated
 * view of a tenant's client. Sections switch via a single dropdown; the
 * Overview shows a date-filterable Recent Activity stream (Activity Manager
 * records for this contact), summary cards (Project manager / Active Tasks /
 * Scheduled Tasks / Accounts Receivable), Client Details and Key Information.
 * Edits happen in the owning app via deep links, or in the contact dialog.
 */

type SectionId =
  | 'overview'
  | 'notes'
  | 'tasks'
  | 'projects'
  | 'schedule'
  | 'invoicing'
  | 'documents';

const SECTIONS: { value: SectionId; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'notes', label: 'Notes' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'projects', label: 'Projects' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'invoicing', label: 'Invoicing' },
  { value: 'documents', label: 'Documents' },
];

/** Firestore hands back Timestamps for fields typed Date; coerce for display. */
const toDate = (value: any): Date | null => {
  if (!value) return null;
  const d: Date = value?.toDate ? value.toDate() : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

/** Timeline date: scheduled start wins, then created, then last updated. */
const dateOf = (task: TaskEvent): Date | null =>
  toDate(task.start) ?? toDate(task.createdAt) ?? toDate(task.updatedAt);

const formatActivityDate = (d: Date): string => {
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
  return format(d, 'EEE d MMM, h:mm a');
};

/** Subject naming carries the type ("Telephone call with...") - see spec. */
const CALL_PATTERN = /\b(call|telephone|phoned|phone)\b/i;

const activityIcon = (task: TaskEvent) => {
  if (CALL_PATTERN.test(task.title || '')) return Phone;
  if (task.status === 'done') return CheckCircle2;
  if (task.isScheduled) return CalendarIcon;
  return MessageSquare;
};

const addressLine = (contact: Contact): string | null => {
  const parts = [
    contact.streetAddress,
    contact.city,
    contact.provinceState,
    contact.postalCode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

const primaryPhone = (contact: Contact): string | null => {
  const byType = contact.primaryPhoneType ? contact[contact.primaryPhoneType] : null;
  return byType || contact.cellPhone || contact.businessPhone || contact.homePhone || null;
};

function StatusPill({ status }: { status: 'todo' | 'inProgress' | 'done' }) {
  if (status === 'inProgress') {
    return (
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
        In Progress
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
        Done
      </span>
    );
  }
  return null;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="block text-xl font-bold leading-tight">{value}</span>
          <span className="block truncate text-xs text-muted-foreground">{sub}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export function ClientRecordView() {
  const params = useParams();
  const contactId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [tasks, setTasks] = useState<TaskEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);

  const [section, setSection] = useState<SectionId>('overview');
  const [activityFrom, setActivityFrom] = useState<Date | undefined>(undefined);
  const [activityTo, setActivityTo] = useState<Date | undefined>(undefined);
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || !contactId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [contactData, foldersData, allTasks, allProjects, allInvoices, companiesData, industriesData] =
        await Promise.all([
          getContactById(contactId),
          getContactFolders(user.uid),
          getTasksForUser(user.uid),
          getProjects(user.uid),
          getInvoices(user.uid),
          getCompanies(user.uid),
          getIndustries(user.uid),
        ]);
      setContact(contactData);
      setFolders(foldersData);
      setTasks(allTasks.filter((t) => (t.contactId ?? null) === contactId));
      setProjects(allProjects.filter((p) => (p.contactId ?? null) === contactId));
      setInvoices(allInvoices.filter((i) => (i.contactId ?? null) === contactId));
      setCompanies(companiesData);
      setCustomIndustries(industriesData);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load client record',
        description: error?.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [contactId, user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Derived counts (spec: Active Tasks / Scheduled Tasks / AR outstanding) ---
  const folderName = useMemo(
    () => folders.find((f) => f.id === contact?.folderId)?.name ?? 'Client',
    [folders, contact]
  );

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'done'), [tasks]);
  const inProgressCount = useMemo(
    () => tasks.filter((t) => t.status === 'inProgress').length,
    [tasks]
  );
  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.isScheduled)
        .map((t) => ({ task: t, start: toDate(t.start) }))
        .filter((x): x is { task: TaskEvent; start: Date } => x.start !== null && isFuture(x.start))
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [tasks]
  );
  const outstandingTotal = useMemo(
    () => invoices.reduce((sum, inv) => sum + Math.max(0, inv.originalAmount - inv.amountPaid), 0),
    [invoices]
  );

  /** Recent Activity: AM records for this contact, date-filterable (spec). */
  const activityRows = useMemo(() => {
    const hasFilter = Boolean(activityFrom || activityTo);
    const from = activityFrom ? startOfDay(activityFrom) : null;
    const to = activityTo ? endOfDay(activityTo) : null;
    return tasks
      .map((task) => ({ task, when: dateOf(task) }))
      .filter(({ when }) => {
        if (!hasFilter) return true;
        if (!when) return false;
        if (from && when < from) return false;
        if (to && when > to) return false;
        return true;
      })
      .sort((a, b) => (b.when?.getTime() ?? 0) - (a.when?.getTime() ?? 0));
  }, [tasks, activityFrom, activityTo]);

  const hasActivityFilter = Boolean(activityFrom || activityTo);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Link href="/contacts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Clients
        </Link>
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">Client not found</p>
            <p className="text-sm text-muted-foreground">This record may have been deleted or merged.</p>
            <Button asChild variant="outline">
              <Link href="/contacts">Back to Clients</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const phone = primaryPhone(contact);
  const address = addressLine(contact);

  return (
    <div className="p-4 sm:p-6 space-y-6 text-black">
      {/* Back link */}
      <Link href="/contacts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Clients
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-headline">{contact.name}</h1>
            {contact.status && (
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-700">
                {contact.status}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{folderName}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" /> {phone}
              </span>
            )}
            {contact.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" /> {contact.email}
              </span>
            )}
            {address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {address}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href={`/event-manager?contactId=${contact.id}`}>
              <Plus className="mr-2 h-4 w-4" /> Activity Manager
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setIsEditContactOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(`/event-manager?contactId=${contact.id}`)}>
                <CalendarIcon className="mr-2 h-4 w-4" /> Schedule Task
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(`/reports/work-activity?contactId=${contact.id}`)}>
                <ClipboardList className="mr-2 h-4 w-4" /> Generate Work Report
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(`/accounting/invoices/create?contactId=${contact.id}`)}>
                <FileDigit className="mr-2 h-4 w-4" /> Create Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(`/projects/create?contactId=${contact.id}`)}>
                <Briefcase className="mr-2 h-4 w-4" /> Start Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!contact.documentFolderId}
                onSelect={() => router.push(`/document-manager?highlight=${contact.documentFolderId}`)}
              >
                <Files className="mr-2 h-4 w-4" /> View Documents
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Section switcher (spec: single dropdown replaces the tab row) */}
      <div className="flex items-center gap-3">
        <Select value={section} onValueChange={(v) => setSection(v as SectionId)}>
          <SelectTrigger className="w-[220px]" aria-label="Section">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            {SECTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {SECTIONS.find((s) => s.value === section)?.label} for {contact.name}
        </span>
      </div>

      {section === 'overview' && (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-3">
            {/* Recent Activity: Activity Manager records for this contact (spec) */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <div className="flex items-center gap-2">
                  <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={activityFrom ? 'h-8' : 'h-8 text-muted-foreground'}
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                        {activityFrom ? format(activityFrom, 'd MMM yy') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CustomCalendar
                        mode="single"
                        selected={activityFrom}
                        onSelect={(d) => {
                          if (d) {
                            setActivityFrom(d);
                            setIsFromOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover open={isToOpen} onOpenChange={setIsToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={activityTo ? 'h-8' : 'h-8 text-muted-foreground'}
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                        {activityTo ? format(activityTo, 'd MMM yy') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CustomCalendar
                        mode="single"
                        selected={activityTo}
                        onSelect={(d) => {
                          if (d) {
                            setActivityTo(d);
                            setIsToOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    disabled={!hasActivityFilter}
                    onClick={() => {
                      setActivityFrom(undefined);
                      setActivityTo(undefined);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {activityRows.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No activity{hasActivityFilter ? ' in the selected dates' : ' recorded yet'} for this client.
                  </p>
                )}
                {activityRows.slice(0, 25).map(({ task, when }) => {
                  const Icon = activityIcon(task);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => router.push(`/event-manager?eventId=${task.id}`)}
                      className="group flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold group-hover:text-primary">
                            {task.title}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {when ? formatActivityDate(when) : 'No date'}
                          </span>
                        </span>
                        {task.description && (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {task.description}
                          </span>
                        )}
                        {(task.status === 'inProgress' || task.status === 'done') && (
                          <span className="mt-1 inline-block">
                            <StatusPill status={task.status} />
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {activityRows.length > 25 && (
                  <button
                    type="button"
                    className="w-full pt-2 text-right text-xs font-semibold text-primary hover:underline"
                    onClick={() => setSection('notes')}
                  >
                    View all {activityRows.length} entries
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Summary cards (spec: Active Tasks / Scheduled Tasks / AR outstanding) */}
            <div className="space-y-4">
              <SummaryCard
                icon={FolderOpen}
                label="Projects"
                value={String(projects.length)}
                sub={projects.length === 1 ? '1 Active project' : `${projects.length} Projects`}
                onClick={() => setSection('projects')}
              />
              <SummaryCard
                icon={CheckCircle2}
                label="Active Tasks"
                value={String(activeTasks.length)}
                sub={`${activeTasks.length - inProgressCount} open · ${inProgressCount} in progress`}
                onClick={() => setSection('tasks')}
              />
              <SummaryCard
                icon={CalendarIcon}
                label="Scheduled Tasks"
                value={String(upcomingTasks.length)}
                sub={upcomingTasks.length === 1 ? '1 Upcoming activity' : `${upcomingTasks.length} Upcoming activities`}
                onClick={() => setSection('schedule')}
              />
              <SummaryCard
                icon={Receipt}
                label="Invoicing"
                value={formatCurrency(outstandingTotal)}
                sub="Outstanding"
                onClick={() => setSection('invoicing')}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Client Details */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg">Client Details</CardTitle>
                <Button variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setIsEditContactOpen(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-[10rem,1fr] gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">Client type</span>
                <span>{folderName}</span>
                <span className="text-muted-foreground">Address</span>
                <span>{address || '—'}</span>
                <span className="text-muted-foreground">Email</span>
                <span className="min-w-0 break-all">{contact.email || '—'}</span>
                <span className="text-muted-foreground">Phone</span>
                <span>{phone || '—'}</span>
              </CardContent>
            </Card>

            {/* Key Information (contact.notes) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg">Key Information</CardTitle>
                <Button variant="ghost" size="sm" className="h-8 text-primary" onClick={() => setIsEditContactOpen(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</p>
                {contact.notes ? (
                  <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-sm">{contact.notes}</p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No key information yet — use Edit to record preferences and important details.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {section === 'notes' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg">Notes &amp; Activity</CardTitle>
            <span className="text-sm text-muted-foreground">{tasks.length} entries</span>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No notes yet — record one with the Activity Manager button above.
              </p>
            )}
            {[...tasks]
              .sort((a, b) => (dateOf(b)?.getTime() ?? 0) - (dateOf(a)?.getTime() ?? 0))
              .map((task) => {
                const Icon = activityIcon(task);
                const when = dateOf(task);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => router.push(`/event-manager?eventId=${task.id}`)}
                    className="group flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors hover:border-primary hover:bg-muted/60"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold group-hover:text-primary">{task.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {when ? formatActivityDate(when) : 'No date'}
                        </span>
                      </span>
                      {task.description && (
                        <span className="mt-1 block whitespace-pre-wrap text-xs text-muted-foreground">
                          {task.description}
                        </span>
                      )}
                      {(task.status === 'inProgress' || task.status === 'done') && (
                        <span className="mt-1 inline-block">
                          <StatusPill status={task.status} />
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
          </CardContent>
        </Card>
      )}

      {section === 'tasks' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg">Active Tasks</CardTitle>
            <span className="text-sm text-muted-foreground">
              {activeTasks.length} open · {inProgressCount} in progress
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeTasks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing outstanding — all tasks for this client are completed.
              </p>
            )}
            {activeTasks.map((task) => {
              const when = toDate(task.start);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => router.push(`/event-manager?eventId=${task.id}`)}
                  className="group flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:border-primary hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold group-hover:text-primary">{task.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {task.isScheduled && when
                        ? `Scheduled ${format(when, 'EEE d MMM, h:mm a')}`
                        : 'Unscheduled'}
                    </span>
                  </span>
                  <StatusPill status={task.status} />
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {section === 'projects' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg">Projects</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link href={`/projects/create?contactId=${contact.id}`}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Start Project
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {projects.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground sm:col-span-2">
                No projects for this client yet.
              </p>
            )}
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}/tasks`}
                className="group flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-primary hover:bg-muted/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <FolderOpen className="h-4 w-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold group-hover:text-primary">{project.name}</span>
                  {project.description && (
                    <span className="block truncate text-xs text-muted-foreground">{project.description}</span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {section === 'schedule' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg">Scheduled Tasks</CardTitle>
            <span className="text-sm text-muted-foreground">{upcomingTasks.length} upcoming</span>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingTasks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nothing scheduled ahead for this client.
              </p>
            )}
            {upcomingTasks.map(({ task, start }) => (
              <button
                key={task.id}
                type="button"
                onClick={() => router.push(`/event-manager?eventId=${task.id}`)}
                className="group flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:border-primary hover:bg-muted/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold group-hover:text-primary">{task.title}</span>
                  <span className="block text-xs text-muted-foreground">{formatActivityDate(start)}</span>
                </span>
                <StatusPill status={task.status} />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {section === 'invoicing' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg">Invoicing</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Outstanding <span className="font-bold text-foreground">{formatCurrency(outstandingTotal)}</span>
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/accounting/invoices/create?contactId=${contact.id}`}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Invoice
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p>No invoices for this client yet.</p>
                <Button asChild variant="link" className="mt-1 px-0 text-primary">
                  <Link href="/accounting/accounts-receivable">Open Accounts Receivable</Link>
                </Button>
              </div>
            )}
            {invoices.map((invoice) => {
              const balance = Math.max(0, invoice.originalAmount - invoice.amountPaid);
              const paid = invoice.status === 'paid';
              const overdue = invoice.status === 'overdue';
              return (
                <Link
                  key={invoice.id}
                  href="/accounting/accounts-receivable"
                  className="group flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-primary hover:bg-muted/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Receipt className="h-4 w-4 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold group-hover:text-primary">
                      {invoice.invoiceNumber}
                      {invoice.companyName ? ` — ${invoice.companyName}` : ''}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {toDate(invoice.invoiceDate) && format(toDate(invoice.invoiceDate)!, 'd MMM yyyy')} · Total{' '}
                      {formatCurrency(invoice.originalAmount)} · Balance {formatCurrency(balance)}
                    </span>
                  </span>
                  <span
                    className={
                      paid
                        ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700'
                        : overdue
                          ? 'rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700'
                          : 'rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700'
                    }
                  >
                    {invoice.status.replace('_', ' ')}
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {section === 'documents' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg">Documents</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link
                href={
                  contact.documentFolderId
                    ? `/document-manager?highlight=${contact.documentFolderId}`
                    : '/document-manager'
                }
              >
                <Files className="mr-1.5 h-3.5 w-3.5" /> Open Document Manager
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {contact.documentFolderId ? (
              <p className="text-sm text-muted-foreground">
                This client has a linked folder in the Document Manager. Use the button above to view, add and manage
                files for {contact.name}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No documents folder is linked to this client yet. A folder is created automatically the first time
                documents are attached to this contact.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <ContactFormDialog
        isOpen={isEditContactOpen}
        onOpenChange={setIsEditContactOpen}
        contactToEdit={contact}
        folders={folders}
        onFoldersChange={setFolders}
        onSave={(saved) => {
          setContact(saved);
          toast({ title: 'Client updated' });
        }}
        companies={companies}
        onCompaniesChange={setCompanies}
        customIndustries={customIndustries}
        onCustomIndustriesChange={setCustomIndustries}
      />
    </div>
  );
}


