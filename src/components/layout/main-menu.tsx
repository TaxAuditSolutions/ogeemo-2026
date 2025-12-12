
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { allMenuItems, type MenuItem } from '@/lib/menu-items';
import { allApps as allGoogleApps } from '@/lib/google-apps';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { UserNav } from '../user-nav';
import { DraggableMenuItem } from './DraggableMenuItem';
import { Button } from '../ui/button';
import { Save, LayoutDashboard, Menu, Layers, Briefcase, Users, Bot, BarChart3, Settings, ExternalLink, Wand2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getUserProfile } from '@/services/user-profile-service';
import { getActionChips, type ActionChipData } from '@/services/project-service';
import { ActionChipMenu } from './ActionChipMenu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebarView } from '@/context/sidebar-view-context';

const groupedMenuItems = {
    Workspace: { icon: Briefcase, items: ['/action-manager', '/calendar', '/tasks', '/files', '/ogeemail'] },
    Relationships: { icon: Users, items: ['/contacts', '/crm'] },
    Operations: { icon: Bot, items: ['/projects', '/time', '/accounting'] },
    Growth: { icon: BarChart3, items: ['/reports', '/marketing-manager', '/research', '/ideas'] },
    Administration: { icon: Settings, items: ['/hr-manager', '/legal-hub', '/backup'] },
};

export function MainMenu() {
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState<MenuItem[]>(allMenuItems);
  const [actionChips, setActionChips] = useState<ActionChipData[]>([]);
  const { preferences, isLoading: isLoadingPreferences, updatePreferences, loadPreferences } = useUserPreferences();
  const { user } = useAuth();
  const { toast } = useToast();
  const { view, setView } = useSidebarView();
  const [isLoadingChips, setIsLoadingChips] = useState(true);

  const sortMenuItems = useCallback((order: string[]) => {
    const orderedItems = order
      .map(href => allMenuItems.find(item => item.href === href))
      .filter(Boolean) as MenuItem[];
    const remainingItems = allMenuItems.filter(item => !order.includes(item.href));
    return [...orderedItems, ...remainingItems];
  }, []);
  
  const refreshMenuOrder = useCallback(async () => {
    if (user) {
        const profile = await getUserProfile(user.uid);
        const savedOrder = profile?.preferences?.menuOrder;
        if (savedOrder && savedOrder.length > 0) {
            setMenuItems(sortMenuItems(savedOrder));
        } else {
            setMenuItems([...allMenuItems].sort((a, b) => a.label.localeCompare(b.label)));
        }
    }
  }, [user, sortMenuItems]);

  useEffect(() => {
    refreshMenuOrder();
    
    const handleMenuOrderChange = () => refreshMenuOrder();
    window.addEventListener('menuOrderChanged', handleMenuOrderChange);
    return () => window.removeEventListener('menuOrderChanged', handleMenuOrderChange);

  }, [refreshMenuOrder]);

  const loadChips = useCallback(async () => {
    if (user) {
        setIsLoadingChips(true);
        try {
            const chips = await getActionChips(user.uid);
            setActionChips(chips);
        } catch (error) {
            console.error("Failed to load action chips for sidebar:", error);
        } finally {
            setIsLoadingChips(false);
        }
    }
  }, [user]);

  useEffect(() => {
    loadChips();
    
    // Listen for custom event to reload chips if they are changed on another page
    const handleChipsUpdate = () => loadChips();
    window.addEventListener('chipsUpdated', handleChipsUpdate);
    return () => window.removeEventListener('chipsUpdated', handleChipsUpdate);

  }, [loadChips]);

  const moveMenuItem = useCallback((dragIndex: number, hoverIndex: number) => {
    setMenuItems((prevItems: MenuItem[]) => {
      const newItems = [...prevItems];
      const [draggedItem] = newItems.splice(dragIndex, 1);
      newItems.splice(hoverIndex, 0, draggedItem);
      return newItems;
    });
  }, []);
  
  const handleSaveChanges = async () => {
    if (!user) return;
    try {
        const orderToSave = menuItems.map(item => item.href);
        const profile = await getUserProfile(user.uid);
        await updateUserProfile(user.uid, user.email || '', {
            ...profile,
            preferences: { ...profile?.preferences, menuOrder: orderToSave }
        });

        toast({
            title: "Menu Order Saved",
            description: "Your new menu order has been saved."
        });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    }
  };

  const handleSetDefaultView = () => {
    updatePreferences({ defaultSidebarView: view });
    toast({
      title: 'Default View Saved',
      description: `Your sidebar will now open to the "${view === 'dashboard' ? 'Favorite Actions' : view === 'fullMenu' ? 'Full Menu' : 'Groups'}" view.`,
    });
  };

  const renderGroupedView = () => (
    <Accordion type="multiple" className="w-full space-y-1">
      {Object.entries(groupedMenuItems).map(([groupName, groupData]) => {
        const CategoryIcon = groupData.icon;
        const groupItems = groupData.items
          .map(href => allMenuItems.find(item => item.href === href))
          .filter(Boolean) as MenuItem[];

        return (
          <AccordionItem value={groupName} key={groupName} className="border-b-0">
            <AccordionTrigger className="p-0 hover:no-underline">
                <div className="flex h-9 w-full items-center justify-start gap-2 rounded-md p-2 text-sm font-bold text-sidebar-foreground/80 hover:bg-sidebar-accent">
                    <CategoryIcon className="h-4 w-4" />
                    {groupName}
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-1 pl-4">
                <div className="space-y-1">
                {groupItems.map(item => (
                    <DraggableMenuItem
                    key={item.href}
                    item={item}
                    index={-1}
                    isActive={pathname === item.href || (item.href !== '/action-manager' && pathname.startsWith(item.href))}
                    moveMenuItem={() => {}}
                    isDraggable={false}
                    isCompact={true}
                    />
                ))}
                </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
       <AccordionItem value="google-apps" key="google-apps" className="border-b-0">
            <AccordionTrigger className="p-0 hover:no-underline">
                <div className="flex h-9 w-full items-center justify-start gap-2 rounded-md p-2 text-sm font-bold text-sidebar-foreground/80 hover:bg-sidebar-accent">
                    <Wand2 className="h-4 w-4" />
                    Google Apps
                </div>
            </AccordionTrigger>
            <AccordionContent className="pt-1 pl-4">
                <div className="space-y-1">
                {allGoogleApps.map(app => {
                    const AppIcon = app.icon;
                    return (
                        <Button
                            key={app.href}
                            asChild
                            variant="ghost"
                            className="w-full justify-start gap-3 h-9 text-sm border-b-4 border-black hover:bg-sidebar-accent/90 active:mt-1 active:border-b-2"
                        >
                            <a href={app.href} target="_blank" rel="noopener noreferrer">
                                <AppIcon className="h-4 w-4" />
                                <span>{app.name}</span>
                                <ExternalLink className="ml-auto h-3 w-3" />
                            </a>
                        </Button>
                    );
                })}
                </div>
            </AccordionContent>
          </AccordionItem>
    </Accordion>
  );

  return (
    <div className="flex flex-col h-full p-2">
      <div className="flex items-center gap-1 p-1 rounded-md bg-muted mb-2">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={view === 'fullMenu' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="flex-1 h-8 w-full"
                        onClick={() => setView('fullMenu')}
                    >
                        <Menu className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Full Menu</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                     <Button
                        variant={view === 'grouped' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="flex-1 h-8 w-full"
                        onClick={() => setView('grouped')}
                    >
                        <Layers className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Groups</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={view === 'dashboard' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="flex-1 h-8 w-full"
                        onClick={() => setView('dashboard')}
                    >
                        <LayoutDashboard className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Favorite Actions</p></TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="flex-1 h-8 w-full"
                        onClick={handleSetDefaultView}
                    >
                        <Save className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Set as Default View</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex-1 space-y-1">
        {view === 'fullMenu' ? (
            menuItems.map((item, index) => (
            <DraggableMenuItem
                key={item.href}
                item={item}
                index={index}
                isActive={pathname === item.href || (item.href !== '/action-manager' && pathname.startsWith(item.href))}
                moveMenuItem={moveMenuItem}
            />
            ))
        ) : view === 'dashboard' ? (
            <ActionChipMenu chips={actionChips} isLoading={isLoadingChips} />
        ) : (
            renderGroupedView()
        )}
      </div>
      
      {view === 'fullMenu' && (
        <div className="p-2 mt-2">
            <Button onClick={handleSaveChanges} className="w-full">
                <Save className="mr-2 h-4 w-4" /> Save Order
            </Button>
        </div>
      )}

       <div className="mt-auto md:hidden">
            <UserNav />
        </div>
    </div>
  );
}
