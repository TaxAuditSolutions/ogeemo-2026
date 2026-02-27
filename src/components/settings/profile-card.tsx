"use client";

import React from "react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, Shield, Lock } from "lucide-react";

const profileSchema = z.object({
    displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
    email: z.string().email({ message: "Please enter a valid email address." }).optional(),
    employeeNumber: z.string().optional(),
    companyName: z.string().optional(),
    website: z.string().optional(),
    businessPhone: z.string().optional(),
    cellPhone: z.string().optional(),
    bestPhone: z.enum(['business', 'cell']).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileCardProps {
  form: UseFormReturn<ProfileFormData>;
  isLoading: boolean;
  profile: any;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ form, isLoading, profile }) => {
  const { user } = useAuth();
  
  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts[0]) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getRoleLabel = (r: string | undefined) => {
    switch (r) {
      case 'admin': return 'Admin (Full Orchestration)';
      case 'editor': return 'Read/Edit (Operational)';
      case 'viewer': return 'Read Only (Intelligence)';
      case 'none': return 'No Access (Revoked)';
      default: return 'User';
    }
  };

  const getRoleIcon = (r: string | undefined) => {
    switch (r) {
      case 'admin': return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'editor': return <ShieldCheck className="h-4 w-4 text-primary" />;
      case 'viewer': return <Shield className="h-4 w-4 text-muted-foreground" />;
      case 'none': return <Lock className="h-4 w-4 text-destructive" />;
      default: return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  if (isLoading || !user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
          <CardDescription>Your user profile information.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center space-x-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Update your secure operational details.</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1.5 py-1 px-3 bg-muted/50">
              {getRoleIcon(profile?.role)}
              <span className="text-[10px] uppercase font-bold tracking-widest">{getRoleLabel(profile?.role)}</span>
          </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16 border-2 border-primary/10">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User avatar'} />
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
          <div className="space-y-4 flex-1">
            <FormField control={form.control} name="displayName" render={({ field }) => ( <FormItem> <FormLabel>Display Name</FormLabel> <FormControl><Input placeholder="Your Name" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input type="email" placeholder="your@email.com" {...field} readOnly className="bg-muted/50" /></FormControl> <FormMessage /> </FormItem> )} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="Your Company LLC" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="employeeNumber" render={({ field }) => (<FormItem><FormLabel>Original ID / Employee #</FormLabel><FormControl><Input placeholder="e.g., U-1001" {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>

        <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        
        <div className="space-y-4">
            <FormField control={form.control} name="businessPhone" render={({ field }) => (<FormItem><FormLabel>Business Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="cellPhone" render={({ field }) => (<FormItem><FormLabel>Cell Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        
        <FormField control={form.control} name="bestPhone" render={({ field }) => (
            <FormItem className="space-y-2">
                <FormLabel>Best number to call</FormLabel>
                <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="business" /></FormControl><FormLabel className="font-normal">Business</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="cell" /></FormControl><FormLabel className="font-normal">Cell</FormLabel></FormItem>
                    </RadioGroup>
                </FormControl>
            </FormItem>
        )} />
      </CardContent>
    </Card>
  );
};