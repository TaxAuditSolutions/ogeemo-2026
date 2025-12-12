
'use client';

import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const users = [
  {
    name: "Olivia Martin",
    email: "olivia.martin@email.com",
    role: "Admin",
    status: "active",
    createdAt: "2023-06-23",
  },
  {
    name: "Jackson Lee",
    email: "jackson.lee@email.com",
    role: "Developer",
    status: "active",
    createdAt: "2023-06-24",
  },
  {
    name: "Isabella Nguyen",
    email: "isabella.nguyen@email.com",
    role: "Editor",
    status: "inactive",
    createdAt: "2023-06-25",
  },
  {
    name: "William Kim",
    email: "will@email.com",
    role: "Developer",
    status: "active",
    createdAt: "2023-06-26",
  },
  {
    name: "Sofia Davis",
    email: "sofia.davis@email.com",
    role: "Viewer",
    status: "active",
    createdAt: "2023-06-27",
  },
];

export function DataView() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-3xl font-bold font-headline text-primary">Data Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Users Collection</CardTitle>
          <CardDescription>
            A list of users in your database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">
                  Created at
                </TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.email}>
                  <TableCell className="font-medium">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground md:hidden">
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={user.status === "active" ? "secondary" : "outline"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {user.createdAt}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
