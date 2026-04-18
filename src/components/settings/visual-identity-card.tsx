'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { Palette, RefreshCw, CheckCircle2, ShieldCheck, Save, Plus, Trash2, Heart, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

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
    const { toast } = useToast();
    const colors = preferences?.themeColors || {};
    const customPresets = preferences?.customPresets || [];

    const [newPresetName, setNewPresetName] = useState('');
    const [isNamingPreset, setIsNamingPreset] = useState(false);

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

    const handleSaveCustomPreset = async () => {
        if (!newPresetName.trim()) {
            toast({ variant: 'destructive', title: 'Invalid Name', description: 'Please enter a name for your preset.' });
            return;
        }

        const newPreset = {
            name: newPresetName.trim(),
            colors: { ...colors }
        };

        const updatedPresets = [...customPresets, newPreset];
        
        try {
            await updatePreferences({ customPresets: updatedPresets });
            toast({ title: 'Preset Saved', description: `"${newPresetName}" added to your library.` });
            setNewPresetName('');
            setIsNamingPreset(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        }
    };

    const handleDeleteCustomPreset = async (name: string) => {
        const updatedPresets = customPresets.filter(p => p.name !== name);
        try {
            await updatePreferences({ customPresets: updatedPresets });
            toast({ title: 'Preset Removed' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
        }
    };

    const ColorInput = ({ label, id, value }: { label: string, id: string, value?: string }) => (
        <div className="flex items-center justify-between gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <Label htmlFor={id} className="text-sm font-medium flex-1 cursor-pointer">{label}</Label>
            <div className="flex items-center gap-2">
                <Input 
                    value={value || ''} 
                    onChange={(e) => handleColorChange(id, e.target.value)}
                    className="h-8 w-24 text-[10px] font-mono uppercase text-center"
                    placeholder="#000000"
                />
                <input 
                    type="color" 
                    id={id} 
                    value={value && value.startsWith('#') && value.length === 7 ? value : '#000000'} 
                    onChange={(e) => handleColorChange(id, e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border-none bg-transparent shrink-0"
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
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <ShieldCheck className="h-3 w-3" /> Operational Nodes
                        </h4>
                        {!isNamingPreset ? (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-[10px] uppercase font-bold text-primary"
                                onClick={() => setIsNamingPreset(true)}
                            >
                                <Save className="mr-1.5 h-3 w-3" /> Save Current as Preset
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                                <Input 
                                    placeholder="Preset Name..." 
                                    className="h-7 text-[10px] w-32" 
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    autoFocus
                                />
                                <Button size="sm" className="h-7 px-2" onClick={handleSaveCustomPreset}>Save</Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsNamingPreset(false)}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="grid gap-1">
                        <ColorInput label="Operational Primary" id="primary" value={colors.primary} />
                        <ColorInput label="Workspace Surface" id="background" value={colors.background} />
                        <ColorInput label="Navigation Strip (Sidebar)" id="sidebar" value={colors.sidebar} />
                        <ColorInput label="Command Bar (Header)" id="header" value={colors.header} />
                        <ColorInput label="Audit Borders" id="border" value={colors.border} />
                    </div>
                </div>

                {customPresets.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Heart className="h-3 w-3 text-red-500" /> My Presets
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                                {customPresets.map((preset) => (
                                    <div key={preset.name} className="flex gap-1 group">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-9 text-[10px] uppercase font-bold justify-start px-2 flex-1 hover:border-primary truncate"
                                            onClick={() => applyPreset(preset.colors)}
                                        >
                                            <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: preset.colors.primary }} />
                                            <span className="truncate">{preset.name}</span>
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDeleteCustomPreset(preset.name)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

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
