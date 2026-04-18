
"use client";

import React, { useState, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { allMenuItems, type MenuItem } from '@/lib/menu-items';
import { allApps as allGoogleApps } from '@/lib/google-apps';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { DraggableMenuItem } from './DraggableMenuItem';
import { Button } from '../ui/button';
import { Save, LayoutDashboard, Menu, Layers, Briefcase, Users, Bot, BarChart3, Settings, ExternalLink, Wand2, PlayCircle, ClipboardList } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getActionChips } from '@/services/project-service';
import { type ActionChipData } from '@/types/calendar-types';
import { ActionChipMenu } from './ActionChipMenu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebarView } from '@/context/sidebar-view-context';
import { cn } from '@/lib/utils';
import { getUserProfile } from '@/core/user-profile-service';

const groupedMenuItems = {
    Workspace: { icon: Briefcase, items: ['/master-mind', '/action-manager', '/action-chips-info', '/calendar', '/to-do', '/document-manager', '/email-hub'] },
    Relationships: { icon: Users, items: ['/contacts', '/crm/plan', '/ai-dispatch'] },
    Operations: { icon: Bot, items: ['/projects/all', '/project-status', '/accounting', '/audit-ready'] },
    Reports: { icon: ClipboardList, items: ['/reports', '/reports/work-activity', '/reports/client-statement', '/reports/time-log', '/reports/client-time-log', '/reports/search'] },
    Growth: { icon: BarChart3, items: ['/marketing-manager', '/idea-board', '/feedback'] },
    Administration: { icon: Settings, items: ['/hr-manager', '/image-manager', '/backup', '/tools/image-generator', '/user-manager'] },
};

const GroupedMenuView = memo(({ pathname, isAdmin }: { pathname: string, isAdmin: boolean }) => (
  <Accordion type="multiple" className="w-full space-y-1">
    {Object.entries(groupedMenuItems).map(([groupName, groupData]) => {
      const CategoryIcon = groupData.icon;
      const groupItems = groupData.items
        .map(href => allMenuItems.find(item => item.href === href))
        .filter(Boolean) as MenuItem[];
      
      const filteredItems = groupItems.filter(item => {
          if (item.adminOnly && !isAdmin) return false;
          return true;
      });

      if (filteredItems.length === 0) return null;

      return (
        <AccordionItem value={groupName} key={groupName} className="border-b-0">
          <AccordionTrigger className="p-0 hover:no-underline">
              <div className="flex h-9 w-full items-center justify-start gap-2 rounded-md p-2 text-sm font-bold text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  <CategoryIcon className="h-4 w-4" />
                  {groupName}
              </div>
          </AccordionTrigger>
          <AccordionContent className="pt-1 pl-4">
              <div className="space-y-1">
              {filteredItems.map(item => (
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
              <div className="flex h-9 w-full items-center justify-start gap-2 rounded-md p-2 text-sm font-bold text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
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
                          className="w-full justify-start gap-3 h-9 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
));

GroupedMenuView.displayName = "GroupedMenuView";

export function MainMenu() {
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState<MenuItem[]>(allMenuItems);
  const [actionChips, setActionChips] = useState<ActionChipData[]>([]);
  const { preferences, isLoading: isLoadingPreferences, updatePreferences } = useUserPreferences();
  const { user } = useAuth();
  const { toast } = useToast();
  const { view, setView } = useSidebarView();
  const [isLoadingChips, setIsLoadingChips] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdminStatus() {
        if (user) {
            try {
                const profile = await getUserProfile(user.uid);
                setIsAdmin(profile?.role === 'admin');
            } catch (error) {
                console.error("Failed to check admin status", error);
            }
        }
    }
    checkAdminStatus();
  }, [user]);

  const sortMenuItems = useCallback((order: string[]) => {
    const orderedItems = order
      .map(href => allMenuItems.find(item => item.href === href))
      .filter(Boolean) as MenuItem[];
    const remainingItems = allMenuItems.filter(item => !order.includes(item.href));
    return [...orderedItems, ...remainingItems];
  }, []);
  
  const refreshMenuOrder = useCallback(async () => {
    if (user && preferences?.menuOrder) {
        const savedOrder = preferences.menuOrder;
        if (savedOrder && savedOrder.length > 0) {
            setMenuItems(sortMenuItems(savedOrder));
        } else {
            setMenuItems([...allMenuItems].sort((a, b) => a.label.localeCompare(b.label)));
        }
    }
  }, [user, preferences, sortMenuItems]);

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
        updatePreferences({ menuOrder: orderToSave });
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

  const displayedMenuItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full p-2">
      <div className="flex items-center gap-1 p-1 rounded-md bg-muted mb-2 text-black">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={view === 'fullMenu' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="flex-1 h-8 w-full text-black"
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
                        className="flex-1 h-8 w-full text-black"
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
                        className="flex-1 h-8 w-full text-black"
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
                        className="flex-1 h-8 w-full text-black"
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
            displayedMenuItems.map((item, index) => (
            <DraggableMenuItem
                key={item.href}
                item={item}
                index={index}
                isActive={(pathname || '') === item.href || (item.href !== '/action-manager' && (pathname || '').startsWith(item.href))}
                moveMenuItem={moveMenuItem}
                isDraggable={false}
                isCompact={true}
            />
            ))
        ) : view === 'dashboard' ? (
            <ActionChipMenu chips={actionChips} isLoading={isLoadingChips} />
        ) : (
            <GroupedMenuView pathname={pathname || ''} isAdmin={isAdmin} />
        )}
      </div>
      
      {view === 'fullMenu' && (
        <div className="p-2 mt-2">
            <Button onClick={handleSaveChanges} className="w-full">
                <Save className="mr-2 h-4 w-4" /> Save Order
            </Button>
        </div>
      )}
    </div>
  );
}
