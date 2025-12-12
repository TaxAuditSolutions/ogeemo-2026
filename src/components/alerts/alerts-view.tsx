
'use client';

import * as React from 'react';
import { Bell, Calendar, User, FileWarning, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type Alert = {
    id: string;
    icon: React.ElementType;
    title: string;
    description: string;
    timestamp: Date;
    read: boolean;
    category: 'Tasks' | 'System' | 'Contacts';
};

const initialAlerts: Alert[] = [
    { id: '1', icon: Calendar, title: 'Task Overdue', description: 'Task "Finalize Marketing Plan" was due yesterday.', timestamp: new Date(Date.now() - 86400000 * 1.5), read: false, category: 'Tasks' },
    { id: '2', icon: Bell, title: 'System Backup Complete', description: 'Weekly backup of application data was successful.', timestamp: new Date(Date.now() - 3600000 * 2), read: false, category: 'System' },
    { id: '3', icon: User, title: 'New Contact Added', description: 'Contact "Eve Davis" was added to your "Work" folder.', timestamp: new Date(Date.now() - 3600000 * 6), read: true, category: 'Contacts' },
    { id: '4', icon: FileWarning, title: 'File Upload Failed', description: 'The file "annual-report-2024.pdf" could not be uploaded due to a server error.', timestamp: new Date(Date.now() - 3600000 * 8), read: false, category: 'System' },
    { id: '5', icon: Calendar, title: 'Upcoming Deadline', description: 'Task "Design new dashboard layout" is due tomorrow.', timestamp: new Date(Date.now() - 3600000 * 22), read: true, category: 'Tasks' },
];

export function AlertsView() {
    const [alerts, setAlerts] = React.useState<Alert[]>(initialAlerts);

    const toggleReadStatus = (id: string) => {
        setAlerts(prev => prev.map(alert => alert.id === id ? { ...alert, read: !alert.read } : alert));
    };

    const markAllAsRead = () => {
        setAlerts(prev => prev.map(alert => ({...alert, read: true})));
    };
    
    const unreadCount = alerts.filter(a => !a.read).length;

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">Alerts Manager</h1>
                <p className="text-muted-foreground">A centralized view of all important notifications.</p>
            </header>

            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Notifications</CardTitle>
                            <CardDescription>You have {unreadCount} unread alerts.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>Mark all as read</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {alerts.map((alert, index) => (
                            <React.Fragment key={alert.id}>
                                <div className={cn("flex items-start gap-4 p-4 rounded-lg", !alert.read && "bg-primary/5")}>
                                    <alert.icon className="h-5 w-5 mt-1 text-muted-foreground" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{alert.title}</p>
                                                <p className="text-sm text-muted-foreground">{alert.description}</p>
                                            </div>
                                            <Badge variant={alert.category === 'System' ? 'default' : alert.category === 'Tasks' ? 'secondary' : 'outline'}>
                                                {alert.category}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(alert.timestamp, { addSuffix: true })}</p>
                                            <Button size="sm" variant="ghost" onClick={() => toggleReadStatus(alert.id)}>
                                                {alert.read ? (
                                                    <><X className="mr-2 h-4 w-4" /> Mark as unread</>
                                                ) : (
                                                    <><Check className="mr-2 h-4 w-4" /> Mark as read</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                {index < alerts.length - 1 && <Separator />}
                            </React.Fragment>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
