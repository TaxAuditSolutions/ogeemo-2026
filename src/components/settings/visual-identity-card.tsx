'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Palette, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const THEME_PRESETS = [
    {
        name: "Classic Ogeemo",
        colors: { primary: '#1E8E86', background: '#ffffff', sidebar: '#1e293b', header: '#3DD5C0', border: '#e2e8f0' }
    },
    {
        name: "Deep Slate Ops",
        colors: { primary: '#3b82f6', background: '#f8fafc', sidebar: '#0f172a', header: '#1e293b', border: '#cbd5e1' }
    },
    {
        name: "Forest Compliance",
        colors: { primary: '#15803d', background: '#f0fdf4', sidebar: '#064e3b', header: '#166534', border: '#bbf7d0' }
    },
    {
        name: "Professional Midnight",
        colors: { primary: '#8b5cf6', background: '#ffffff', sidebar: '#1e1b4b', header: '#4c1d95', border: '#e2e8f0' }
    }
];

export function VisualIdentityCard() {
    const { preferences, updatePreferences } = useUserPreferences();
    const colors = preferences?.themeColors || {};

    const handleColorChange = (key: string, value: string) => {
        updatePreferences({
            themeColors: { ...colors, [key]: value }
        });
    };

    const applyPreset = (presetColors: any) => {
        updatePreferences({ themeColors: presetColors });
    };

    const resetToDefault = () => {
        applyPreset(THEME_PRESETS[0].colors);
    };

    const ColorInput = ({ label, id, value }: { label: string, id: string, value?: string }) => (
        <div className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <Label htmlFor={id} className="text-sm font-medium flex-1 cursor-pointer">{label}</Label>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{value}</span>
                <input 
                    type="color" 
                    id={id} 
                    value={value || '#000000'} 
                    onChange={(e) => handleColorChange(id, e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border-none bg-transparent"
                />
            </div>
        </div>
    );

    return (
        <Card className="shadow-md border-primary/10 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Palette className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Visual Identity Orchestration</CardTitle>
                        <CardDescription>Personalize your workspace aesthetics.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ShieldCheck className="h-3 w-3" /> Operational Nodes
                    </h4>
                    <div className="grid gap-1">
                        <ColorInput label="Operational Primary" id="primary" value={colors.primary} />
                        <ColorInput label="Workspace Surface" id="background" value={colors.background} />
                        <ColorInput label="Navigation Strip (Sidebar)" id="sidebar" value={colors.sidebar} />
                        <ColorInput label="Command Bar (Header)" id="header" value={colors.header} />
                        <ColorInput label="Audit Borders" id="border" value={colors.border} />
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Protocol Presets</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {THEME_PRESETS.map((preset) => (
                            <Button 
                                key={preset.name} 
                                variant="outline" 
                                size="sm" 
                                className="h-9 text-[10px] uppercase font-bold justify-start px-2 hover:border-primary"
                                onClick={() => applyPreset(preset.colors)}
                            >
                                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: preset.colors.primary }} />
                                {preset.name}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t p-4 justify-between">
                <Button variant="ghost" size="sm" onClick={resetToDefault} className="text-xs">
                    <RefreshCw className="mr-2 h-3 w-3" /> Reset to Protocol Default
                </Button>
                <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase">
                    <CheckCircle2 className="h-3 w-3" /> Active Sync
                </div>
            </CardFooter>
        </Card>
    );
}
