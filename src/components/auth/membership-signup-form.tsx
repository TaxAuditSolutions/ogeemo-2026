"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoaderCircle, UserPlus, Users, Building2, ShieldCheck, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { calculateMembershipPrice } from "@/core/organization-service";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  businessName: z.string().min(2, { message: "Business name is required for membership." }),
  seatCount: z.coerce.number().min(1).max(100).default(5),
});

export type SignupFormData = z.infer<typeof signupSchema>;

interface MembershipSignupFormProps {
  onSubmit: (data: SignupFormData) => Promise<void>;
  isLoading: boolean;
}

export function MembershipSignupForm({ onSubmit, isLoading }: MembershipSignupFormProps) {
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      businessName: "",
      seatCount: 5,
    },
  });

  const seatCount = form.watch("seatCount");
  const [totalPrice, setTotalPrice] = useState(25);

  useEffect(() => {
    setTotalPrice(calculateMembershipPrice(seatCount));
  }, [seatCount]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Founder Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/20" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Work Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/20" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Secure Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="h-12 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/20" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Business / Organization Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Acme Orchestration Inc." className="h-12 pl-11 bg-muted/30 border-none rounded-xl focus-visible:ring-primary/20" {...field} disabled={isLoading} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h4 className="font-bold tracking-tight">Seat Allocation</h4>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold">
                ${totalPrice}.00 / mo
              </Badge>
            </div>
            
            <FormField
              control={form.control}
              name="seatCount"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-4">
                      <Input 
                        type="range" 
                        min="1" 
                        max="50" 
                        className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                        {...field} 
                        disabled={isLoading}
                      />
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span>1 Seat</span>
                        <span>{field.value} Seats Selected</span>
                        <span>50 Seats</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs mt-2 italic">
                    $25 includes your first 5 seats. Each additional seat is just $5/mo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="pt-2">
            <div className="flex items-center gap-3 p-4 bg-slate-950 text-white rounded-2xl mb-6 shadow-xl border border-white/10">
                <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                <p className="text-xs leading-relaxed opacity-90">
                    <strong>Founders Commitment:</strong> By joining today, you lock in this pricing for the life of your organization. No tiers, no traps, no hidden fees.
                </p>
            </div>
            
            <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all" disabled={isLoading}>
                {isLoading ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5" />}
                {isLoading ? "Provisioning..." : "Claim Your Membership"}
            </Button>
        </div>
      </form>
    </Form>
  );
}

function Badge({ children, className, variant }: any) {
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${className}`}>
            {children}
        </span>
    );
}
