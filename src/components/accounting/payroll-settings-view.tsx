
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
import { Separator } from '../ui/separator';

const PAYROLL_SETTINGS_KEY = 'payrollSettings';

interface PayrollSettings {
  companyName: string;
  companyAddress: string;
  paySchedule: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  payrollBankAccount: string;
  federalTaxId: string;
  provincialTaxId: string;
}

const defaultSettings: PayrollSettings = {
  companyName: '',
  companyAddress: '',
  paySchedule: 'bi-weekly',
  payrollBankAccount: '',
  federalTaxId: '',
  provincialTaxId: '',
};

// Mock data, in a real app this would come from the user's chart of accounts
const bankAccounts = ["Main Checking Account (...1234)", "Operating Account (...5678)"];

export function PayrollSettingsView() {
  const [settings, setSettings] = useState<PayrollSettings>(defaultSettings);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(PAYROLL_SETTINGS_KEY);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
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
    <div className="p-4 sm:p-6 space-y-6">
      <AccountingPageHeader pageTitle="Payroll Settings" />
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Payroll Settings</h1>
        <p className="text-muted-foreground">Configure your company's payroll information and schedules.</p>
      </header>

      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Payroll Schedule & Accounts</CardTitle>
            <CardDescription>Define how and when you pay your employees.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paySchedule">Pay Schedule</Label>
              <Select
                value={settings.paySchedule}
                onValueChange={(value) => handleInputChange('paySchedule', value)}
              >
                <SelectTrigger id="paySchedule">
                  <SelectValue placeholder="Select a pay schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly (every 2 weeks)</SelectItem>
                  <SelectItem value="semi-monthly">Semi-monthly (twice a month)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
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
          <CardHeader>
            <CardTitle>Tax Information</CardTitle>
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
