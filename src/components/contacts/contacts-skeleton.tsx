
import {
  Folder,
  Plus,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from '@/components/ui/skeleton';

export function ContactsSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <header className="text-center py-4 sm:py-6 px-4 sm:px-6">
        <h1 className="text-3xl font-bold font-headline text-primary">
          Ogeemo Contact Manager
        </h1>
        <p className="text-muted-foreground">
          Manage your contacts and client relationships
        </p>
      </header>
      <div className="flex-1 min-h-0 pb-4 sm:pb-6">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          <ResizablePanel defaultSize={25} minSize={20}>
            <div className="flex h-full flex-col p-2">
                <div className="p-2">
                    <Button className="w-full" disabled>
                        <Plus className="mr-2 h-4 w-4" /> New Folder
                    </Button>
                </div>
                <nav className="flex flex-col gap-1 p-2">
                    <Button
                        variant="secondary"
                        className="w-full justify-start gap-3"
                    >
                        <Users className="h-4 w-4" />
                        <span>All Contacts</span>
                    </Button>
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                </nav>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={75}>
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b h-20">
                    <div>
                        <Skeleton className="h-7 w-40 mb-2" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-10 w-36" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                 <div className="flex-1 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">
                                  <Checkbox disabled />
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Folder</TableHead>
                                <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell> <Checkbox disabled /> </TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

    