
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, ListTodo, Contact, Clock } from 'lucide-react';
import { mockContacts } from '@/data/contacts';
import { ReportsPageHeader } from '../reports/page-header';

export function ActivityReportView() {
  
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <ReportsPageHeader pageTitle="Activity Report" />
      <header className="text-center">
        <div className="flex flex-col">
            <h1 className="text-3xl font-bold font-headline text-primary">Activity Report</h1>
            <p className="text-muted-foreground">An interactive overview of your workspace.</p>
        </div>
      </header>
      
      <div className="space-y-6">
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">Project Manager is being rebuilt.</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                      <ListTodo className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">Project Manager is being rebuilt.</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                      <Contact className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{mockContacts.length}</div>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold text-destructive">0</div>
                      <p className="text-xs text-muted-foreground">Project Manager is being rebuilt.</p>
                  </CardContent>
              </Card>
          </div>
          <Card>
              <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>A feed of the latest actions in your workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                    <div className="h-48 flex flex-col items-center justify-center bg-muted rounded-lg">
                      <p className="text-muted-foreground">Activity feed is unavailable.</p>
                      <p className="text-xs text-muted-foreground">This component is being rebuilt.</p>
                  </div>
              </CardContent>
          </Card>
        </div>
    </div>
  );
}
