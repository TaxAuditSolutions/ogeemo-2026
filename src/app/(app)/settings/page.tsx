'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Save, LoaderCircle } from "lucide-react";
import { PlanningRitualsCard } from "@/components/settings/planning-rituals-card";
import { ProfileCard } from "@/components/settings/profile-card";
import { Form } from '@/components/ui/form';
import { useAuth } from '@/context/auth-context';
import { getUserProfile, updateUserProfile, type UserProfile } from '@/services/user-profile-service';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
    displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
    companyName: z.string().optional(),
    website: z.string().optional(),
    businessPhone: z.string().optional(),
    cellPhone: z.string().optional(),
    bestPhone: z.enum(['business', 'cell']).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {},
  });

  useEffect(() => {
    async function loadProfile() {
      if (user) {
        setIsLoading(true);
        try {
          const userProfile = await getUserProfile(user.uid);
          setProfile(userProfile);
          if (userProfile) {
            form.reset({
              displayName: userProfile.displayName || user.displayName || '',
              companyName: userProfile.companyName || '',
              website: userProfile.website || '',
              businessPhone: userProfile.businessPhone || '',
              cellPhone: userProfile.cellPhone || '',
              bestPhone: userProfile.bestPhone || undefined,
            });
          }
        } catch (error) {
          console.error("Failed to load user profile:", error);
          toast({
            variant: "destructive",
            title: "Failed to load profile",
            description: "Could not retrieve your profile data.",
          });
        } finally {
          setIsLoading(false);
        }
      } else if (!isAuthLoading) {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [user, isAuthLoading, form, toast]);

  async function onSubmit(values: ProfileFormData) {
    if (!user) {
      toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to save settings." });
      return;
    }
    setIsSubmitting(true);
    try {
        await updateUserProfile(user.uid, user.email || '', values);
        toast({
            title: "Settings Saved",
            description: "Your profile information has been updated successfully.",
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: error.message || "An unknown error occurred while saving your profile.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-6">
        <header className="flex justify-between items-center w-full max-w-4xl mx-auto mb-6">
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold font-headline text-primary">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences.</p>
          </div>
          <div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </header>
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <ProfileCard form={form} isLoading={isLoading} />
          </div>
          <div className="space-y-6">
             <PlanningRitualsCard />
          </div>
        </div>
      </form>
    </Form>
  );
}