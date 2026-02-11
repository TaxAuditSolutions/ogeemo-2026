
import {
    Users,
    Users2,
    Clock,
    CalendarOff,
    Smartphone,
} from 'lucide-react';
import type { MenuItem } from '@/lib/menu-items';

export const hrMenuItems: MenuItem[] = [
    { href: "/hr-manager/time-off", icon: CalendarOff, label: "Time Off / Leave" },
    { href: "/field-app", icon: Smartphone, label: "Field App" },
];

export default hrMenuItems;
