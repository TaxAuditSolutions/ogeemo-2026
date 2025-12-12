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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const profileSchema = z.object({
    displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
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
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ form, isLoading }) => {
  const { user } = useAuth();
  
  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
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
      <CardHeader>
          <CardTitle>My Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User avatar'} />
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1 flex-1">
            <FormField control={form.control} name="displayName" render={({ field }) => ( <FormItem> <FormLabel>Display Name</FormLabel> <FormControl><Input placeholder="Your Name" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
            <div className="text-sm text-muted-foreground pt-1">{user.email}</div>
          </div>
        </div>
        
        <div className="space-y-4">
            <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="Your Company LLC" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
        </div>
        
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