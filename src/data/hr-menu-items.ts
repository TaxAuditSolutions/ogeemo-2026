
import {
    Users,
    Users2,
    Clock,
    CalendarOff,
    Smartphone,
} from 'lucide-react';
import type { MenuItem } from '@/lib/menu-items';

export const hrMenuItems: MenuItem[] = [
    { href: "/accounting/payroll/manage-workers", icon: Users, label: "Worker Directory" },
    { href: "/reports/time-log", icon: Clock, label: "Time Log Report" },
    { href: "/hr-manager/time-off", icon: CalendarOff, label: "Time Off / Leave" },
    { href: "/field-app", icon: Smartphone, label: "Field App" },
];

export default hrMenuItems;
