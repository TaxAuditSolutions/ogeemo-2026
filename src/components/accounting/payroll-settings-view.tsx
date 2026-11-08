"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save } from "lucide-react";
import { AccountingPageHeader } from '@/components/accounting/page-header';
import { useToast } from '@/hooks/use-toast';
import { PayScheduleCard } from '@/components/accounting/pay-schedule-card';

const PAYROLL_SETTINGS_KEY = 'payrollSettings';

interface PayrollSettings {
  companyName: string;
  companyAddress: string;
  payrollBankAccount: string;
  federalTaxId: string;
  provincialTaxId: string;
}

const defaultSettings: PayrollSettings = {
  companyName: '',
  companyAddress: '',
  payrollBankAccount: '',
  federalTaxId: '',
  provincialTaxId: '',
};

// Mock data, in a real app this would come from the user's chart of accounts
const bankAccounts = ["Main Chequing Account (...1234)", "Operating Account (...5678)"];

export function PayrollSettingsView() {
  const [settings, setSettings] = useState<PayrollSettings>(defaultSettings);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(PAYROLL_SETTINGS_KEY);
      if (savedSettings) {
        // Merge over the defaults; older saves also held a pay schedule, which now lives on the organization.
        const { paySchedule: _legacySchedule, ...saved } = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...saved });
      }
    } catch (error) {
      console.error("Failed to load payroll settings:", error);
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(PAYROLL_SETTINGS_KEY, JSON.stringify(settings));
      toast({
        title: "Settings Saved",
        description: "Your payroll settings have been successfully updated.",
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Save Failed",
        description: "Could not save settings to your browser's local storage.",
      });
    }
  };

  const handleInputChange = (field: keyof PayrollSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <AccountingPageHeader pageTitle="Payroll Settings" />
      <header className="print:hidden">
        <h1 className="text-3xl font-bold font-headline text-primary">Payroll Settings</h1>
        <p className="text-muted-foreground">Configure your company's payroll information, pay periods and deductions.</p>
      </header>

      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-base">Company Information</CardTitle>
            <CardDescription>Details used for payroll processing and tax forms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Legal Company Name</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Company Address</Label>
              <Input
                id="companyAddress"
                value={settings.companyAddress}
                onChange={(e) => handleInputChange('companyAddress', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <PayScheduleCard />

        <Card>
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-base">Payroll Accounts</CardTitle>
            <CardDescription>The account you pay your employees from.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payrollBankAccount">Payroll Bank Account</Label>
              <Select
                value={settings.payrollBankAccount}
                onValueChange={(value) => handleInputChange('payrollBankAccount', value)}
              >
                <SelectTrigger id="payrollBankAccount">
                  <SelectValue placeholder="Select the account for payroll" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-base">Tax Information</CardTitle>
            <CardDescription>Your business tax identification numbers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="federalTaxId">Federal Tax ID (BN)</Label>
              <Input
                id="federalTaxId"
                placeholder="e.g., 123456789RP0001"
                value={settings.federalTaxId}
                onChange={(e) => handleInputChange('federalTaxId', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provincialTaxId">Provincial Tax ID (if applicable)</Label>
              <Input
                id="provincialTaxId"
                value={settings.provincialTaxId}
                onChange={(e) => handleInputChange('provincialTaxId', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
            <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4"/>
                Save All Settings
            </Button>
        </div>
      </div>
    </div>
  );
}
