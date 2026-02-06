
"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function PreferencesCard() {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();

  const handleTogglePreference = (key: keyof typeof preferences, checked: boolean) => {
    updatePreferences({ [key]: checked });
  };

  const handleTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
        updatePreferences({ defaultTaxRate: val });
    } else if (e.target.value === '') {
        updatePreferences({ defaultTaxRate: 0 });
    }
  };

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Manage your application preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Skeleton className="h-8 w-full" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Manage your application preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
                <Label htmlFor="dictation-switch" className="text-base">Show Voice Dictation Buttons</Label>
                <p className="text-sm text-muted-foreground">
                    Display the microphone icon for voice-to-text input in forms and chat.
                </p>
            </div>
            <Switch
                id="dictation-switch"
                checked={preferences?.showDictationButton}
                onCheckedChange={(checked) => handleTogglePreference('showDictationButton', checked)}
            />
        </div>

        <Separator />

        <div className="space-y-4">
            <div className="space-y-1">
                <Label htmlFor="default-tax-rate" className="text-base">Default Sales Tax Rate (%)</Label>
                <p className="text-sm text-muted-foreground">
                    This rate will be pre-filled when you post new transactions in the ledger.
                </p>
            </div>
            <div className="flex items-center gap-4 max-w-xs">
                <div className="relative flex-1">
                    <Input
                        id="default-tax-rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={preferences?.defaultTaxRate ?? 15}
                        onChange={handleTaxRateChange}
                        className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
