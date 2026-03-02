'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDrag, useDrop } from 'react-dnd';
import {
  Folder,
  LoaderCircle,
  FolderPlus,
  ChevronRight,
  MoreVertical,
  Trash2,
  Users,
  Plus,
  UserPlus,
  GitMerge,
  Pencil,
  Files,
  Check,
  ChevronsUpDown,
  X,
  Clock,
  Calendar,
  FileDigit,
  Briefcase,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowDownUp,
  Link as LinkIcon,
  Info,
  Save,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Lock,
  UserX,
  KeyRound,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type Contact } from '@/data/contacts';
import { useToast } from '@/hooks/use-toast';
import { getContacts, deleteContacts, updateContact, mergeContacts, addContact } from '@/services/contact-service';
import { getFolders, updateFolder, deleteFolders, ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
import { getCompanies, type Company } from '@/services/accounting-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from '@/components/ui/checkbox';
import { LogTimeDialog } from '@/components/reports/log-time-dialog';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { getUserProfile, updateUserProfile, getUsers, type UserRole, type UserProfile } from '@/services/user-profile-service';
import { ChangePasswordDialog } from '@/components/data/change-password-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const ContactFormDialog = dynamic(() => import('@/components/contacts/contact-form-dialog'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <LoaderCircle className="h-10 w-10 animate-spin text-white" />
    </div>
  ),
});

const AddUserDialog = dynamic(() => import('@/components/data/add-user-dialog').then(mod => mod.AddUserDialog), {
    ssr: false,
});

const MergeContactsDialog = dynamic(() => import('@/components/contacts/MergeContactsDialog'), {
  ssr: false,
});

const ItemTypes = {
  CONTACT: 'contact',
  FOLDER: 'folder',
};

type DroppableItem = (Contact & { type?: 'contact' }) | (FolderData & { type: 'folder' });

const DraggableTableRowInner = React.forwardRef<HTMLTableRowElement, React.ComponentProps<typeof TableRow>>((props, ref) => (
    <TableRow {...props} ref={ref} />
));
DraggableTableRowInner.displayName = "DraggableTableRowInner";

const DraggableTableRow = ({ contact, isHighlighted, children }: { contact: Contact, isHighlighted?: boolean, children: React.ReactNode }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CONTACT,
        item: contact,
        collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }), [contact]);

    return (
      <DraggableTableRowInner id={`row-${contact.id}`} ref={drag} className={cn(isDragging && "opacity-50", isHighlighted && "bg-primary/10 animate-pulse ring-2 ring-primary ring-inset", "cursor-grab")}>
        {children}
      </DraggableTableRowInner>
    );
};

const FolderTreeItem = ({ 
    folder, 
    allFolders, 
    level = 0, 
    selectedFolderId, 
    expandedFolders, 
    onSelectFolder, 
    onToggleExpand, 
    onRenameStart, 
    onDrop, 
    onAddSubfolder,
    onDelete,
    renamingFolderId,
    renameInputValue,
    onRenameChange,
    onRenameConfirm,
    onRenameCancel
}: { 
    folder: FolderData, 
    allFolders: FolderData[], 
    level?: number,
    selectedFolderId: string,
    expandedFolders: Set<string>,
    onSelectFolder: (id: string) => void,
    onToggleExpand: (id: string) => void,
    onRenameStart: (folder: FolderData) => void,
    onDrop: (item: DroppableItem, targetFolderId: string) => void,
    onAddSubfolder: (parentId: string) => void,
    onDelete: (folder: FolderData) => void,
    renamingFolderId: string | null,
    renameInputValue: string,
    onRenameChange: (val: string) => void,
    onRenameConfirm: () => void,
    onRenameCancel: () => void
}) => {
    const hasChildren = allFolders.some(f => f.parentId === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isRenaming = renamingFolderId === folder.id;
    const isSystem = !!folder.isSystem;

    const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
      type: ItemTypes.FOLDER,
      item: { ...folder, type: 'folder' },
      canDrag: !isRenaming && !isSystem,
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }), [folder, isRenaming, isSystem]);

    const [{ canDrop, isOver }, drop] = useDrop(() => ({
      accept: [ItemTypes.CONTACT, ItemTypes.FOLDER],
      drop: (item: DroppableItem) => onDrop(item, folder.id),
      collect: (monitor) => ({ isOver: !!monitor.isOver(), canDrop: !!monitor.canDrop() }),
    }), [folder.id, onDrop]);

    return (
      <div style={{ marginLeft: level > 0 ? `${level * 1}rem` : '0' }} className="my-1 rounded-md" ref={dragPreview}>
        <div
          ref={node => drag(drop(node))}
          className={cn(
            "flex items-center justify-between rounded-md h-9 group",
            isRenaming ? 'bg-background' : 'hover:bg-accent',
            (isOver && canDrop) && 'bg-primary/20 ring-1 ring-primary',
            isDragging && 'opacity-50',
            selectedFolderId === folder.id && !isRenaming && 'bg-accent'
          )}
        >
            <div className="flex-1 flex items-center min-w-0 h-full pl-1 cursor-pointer" onClick={() => !isRenaming && onSelectFolder(folder.id)}>
                {hasChildren ? (
                  <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-90')} onClick={(e) => { e.stopPropagation(); onToggleExpand(folder.id); }} />
                ) : (
                  <div className="w-4 h-4 shrink-0" />
                )}
                <Folder className={cn("h-4 w-4 ml-1 shrink-0", isSystem ? "text-primary/70" : "text-primary")} />
                {isRenaming ? (
                  <Input 
                    autoFocus 
                    value={renameInputValue} 
                    onChange={e => onRenameChange(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter') onRenameConfirm(); if (e.key === 'Escape') onRenameCancel(); }} 
                    className="h-7" 
                    onClick={e => e.stopPropagation()} 
                  />
                ) : (
                  <span className={cn("truncate ml-2 text-sm", isSystem && "font-semibold")}>{folder.name}</span>
                )}
            </div>
            <div className="flex items-center">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 px-1.5">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onSelect={() => onAddSubfolder(folder.id)}><FolderPlus className="mr-2 h-4 w-4" />Create subfolder</DropdownMenuItem>
                      {!isSystem && <DropdownMenuItem onSelect={() => onRenameStart(folder)}><Pencil className="mr-2 h-4 w-4" />Rename</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      {!isSystem ? (
                          <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.stopPropagation(); onDelete(folder); }}>
                              <Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                      ) : (
                          <DropdownMenuItem disabled className="text-xs text-muted-foreground italic">Protected System Folder</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        {isExpanded && allFolders.filter(f => f.parentId === folder.id).sort((a,b) => a.name.localeCompare(b.name)).map(child => (
            <FolderTreeItem 
                key={child.id} 
                folder={child} 
                allFolders={folders} 
                level={level + 1}
                selectedFolderId={selectedFolderId}
                expandedFolders={expandedFolders}
                onSelectFolder={onSelectFolder}
                onToggleExpand={onToggleExpand}
                onRenameStart={onRenameStart}
                onDrop={onDrop}
                onAddSubfolder={onAddSubfolder}
                onDelete={onDelete}
                renamingFolderId={renamingFolderId}
                renameInputValue={renameInputValue}
                onRenameChange={onRenameChange}
                onRenameConfirm={onRenameConfirm}
                onRenameCancel={onRenameCancel}
            />
        ))}
      </div>
    );
};

export function ContactsView() {
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  
  const [renamingFolder, setRenamingFolder] = useState<FolderData | null>(null);
  const [renameInputValue, setRenameInputValue] = useState("");
  
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderData | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [contactToMerge, setContactToMerge] = useState<Contact | null>(null);
  
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
  const [preselectedContactId, setPreselectedContactId] = useState<string | null>(null);
  const [workersForDialog, setWorkersForSelection] = useState<Worker[]>([]);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [userForPasswordChange, setUserForPasswordChange] = useState<UserProfile | null>(null);

  const [initialContactData, setInitialDialogData] = useState<Partial<Contact>>({});
  const [isSystemRegistryOpen, setIsSystemRegistryOpen] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const highlightedId = searchParams ? searchParams.get('highlight') : null;
  const folderNameParam = searchParams ? searchParams.get('folderName') : null;

  const isUsersFolderSelected = useMemo(() => {
      const folder = folders.find(f => f.id === selectedFolderId);
      return folder?.name === 'Users' && folder?.isSystem;
  }, [folders, selectedFolderId]);

  const loadData = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const allFolders = await ensureSystemFolders(user.uid);
        const [fetchedContacts, fetchedCompanies, fetchedIndustries, fetchedWorkers, fetchedProfiles] = await Promise.all([
            getContacts(user.uid),
            getCompanies(user.uid),
            getIndustries(user.uid),
            getWorkers(user.uid),
            getUsers()
        ]);
        
        const usersFolder = allFolders.find(f => f.name === 'Users' && f.isSystem);
        if (usersFolder) {
            // Mirror all Authentication users into the Contacts registry
            for (const profile of fetchedProfiles) {
                const contactMatch = fetchedContacts.find(c => c.email?.toLowerCase() === profile.email?.toLowerCase() || c.id === profile.id);
                if (!contactMatch) {
                    await addContact({
                        name: profile.displayName || profile.email || 'Ogeemo User',
                        email: profile.email,
                        folderId: usersFolder.id,
                        userId: user.uid,
                        role: profile.role,
                        setupSource: 'system',
                        notes: "Mirrored identity record from User Manager."
                    });
                } else if (contactMatch.folderId !== usersFolder.id || contactMatch.role !== profile.role || contactMatch.setupSource !== 'system') {
                    await updateContact(contactMatch.id, { 
                        folderId: usersFolder.id, 
                        role: profile.role,
                        setupSource: 'system' 
                    });
                }
            }
            
            // Re-fetch to include newly mirrored contacts
            const finalContactsList = await getContacts(user.uid);
            setContacts(finalContactsList);
        } else {
            setContacts(fetchedContacts);
        }

        setFolders(allFolders);
        setCompanies(fetchedCompanies);
        setCustomIndustries(fetchedIndustries);
        setUserProfiles(fetchedProfiles);

        const myProfile = fetchedProfiles.find(p => p.id === user.uid);
        const adminName = myProfile?.displayName || user.displayName || user.email || 'Admin';
        const adminIdNumber = myProfile?.employeeNumber || '';
        const adminWorker: Worker = {
            id: user?.uid || '',
            name: `${adminName} (Admin)`,
            email: user?.email || '',
            workerType: 'employee', 
            payType: 'salary',
            payRate: 0,
            userId: user?.uid || '',
            workerIdNumber: adminIdNumber,
        };
        setWorkersForSelection([adminWorker, ...fetchedWorkers]);

        if (usersFolder) {
            setExpandedFolders(new Set([usersFolder.id]));
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to load data", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (folderNameParam && !isLoading && folders.length > 0) {
        const target = folders.find(f => f.name.toLowerCase() === folderNameParam.toLowerCase());
        if (target) {
            setSelectedFolderId(target.id);
            if (target.parentId) {
                setExpandedFolders(p => new Set([...p, target.parentId!]));
            }
        }
    }
  }, [folderNameParam, isLoading, folders]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f && f.id === selectedFolderId),
    [folders, selectedFolderId]
  );

  const displayedContacts = useMemo(
    () => {
        let list = contacts;
        
        if (selectedFolderId !== 'all') {
            const getDescendantFolderIds = (folderId: string): string[] => {
                let ids = [folderId];
                const children = folders.filter(f => f.parentId === folderId);
                children.forEach(child => {
                    ids = [...ids, ...getDescendantFolderIds(child.id)];
                });
                return ids;
            };
            const folderIdsToDisplay = getDescendantFolderIds(selectedFolderId);
            list = list.filter((c) => folderIdsToDisplay.includes(c.folderId));
        }

        return list;
    },
    [contacts, folders, selectedFolderId]
  );

  const systemRegistryContacts = useMemo(
      () => contacts.filter(c => c.setupSource === 'system'),
      [contacts]
  );

  const allVisibleSelected = displayedContacts.length > 0 && selectedContactIds.length === displayedContacts.length;
  
  const handleSelectFolder = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedContactIds([]);
  }, []);

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders(p => {
        const n = new Set(p);
        n.has(folderId) ? n.delete(folderId) : n.add(folderId);
        return n;
    });
  }, []);

  const handleDrop = useCallback(async (item: DroppableItem, newFolderId: string | null) => {
    if (!user) return;
    if (item.id === newFolderId) return;

    if ('email' in item) { 
        if (item.folderId === newFolderId) return;
        try {
            await updateContact(item.id, { folderId: newFolderId! });
            setContacts(prev => prev.map(c => c.id === item.id ? { ...c, folderId: newFolderId! } : c));
            toast({ title: "Contact Moved" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Move Failed", description: error.message });
        }
    } else {
        if (item.parentId === newFolderId) return;
        const folder = folders.find(f => f.id === item.id);
        if (folder?.isSystem) {
            toast({ variant: 'destructive', title: 'Protected Folder', description: 'System folders cannot be moved.' });
            return;
        }
        try {
            await updateFolder(item.id, { parentId: newFolderId });
            setFolders(prev => prev.map(f => f.id === item.id ? { ...f, parentId: newFolderId } : f));
            toast({ title: "Folder Moved" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Move Failed", description: error.message });
        }
    }
  }, [user, toast, folders]);

  const handleRenameConfirm = useCallback(async () => {
    if (!renamingFolder || !renameInputValue.trim() || renamingFolder.name === renameInputValue.trim()) {
      setRenamingFolder(null);
      return;
    }
    try {
      await updateFolder(renamingFolder.id, { name: renameInputValue.trim() });
      setFolders(prev => prev.map(f => f.id === renamingFolder.id ? { ...f, name: renameInputValue.trim() } : f));
      toast({ title: "Folder Renamed" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Rename Failed", description: error.message });
    } finally {
      setRenamingFolder(null);
    }
  }, [renamingFolder, renameInputValue, toast]);

  const handleNewActionClick = useCallback(() => {
    if (isUsersFolderSelected) {
        setContactToEdit(null);
        setUserToEdit(null);
        setIsAddUserDialogOpen(true);
    } else {
        setInitialDialogData({});
        setContactToEdit(null);
        setIsContactFormOpen(true);
    }
  }, [isUsersFolderSelected]);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedContactIds(allVisibleSelected ? [] : displayedContacts.map(c => c.id));
  }, [allVisibleSelected, displayedContacts]);

  const handleToggleSelect = useCallback((contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  }, []);

  const handleConfirmDeleteFolder = async () => {
    if (!user || !folderToDelete) return;
    try {
        await deleteFolders([folderToDelete.id]);
        setFolders(prev => prev.filter(f => f.id !== folderToDelete.id));
        if (selectedFolderId === folderToDelete.id) setSelectedFolderId('all');
        toast({ title: "Folder Deleted" });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    } finally {
        setFolderToDelete(null);
    }
  };

  const handleConfirmDeleteContact = async () => {
    if (!contactToDelete) return;
    try {
        await deleteContacts([contactToDelete.id]);
        setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
        toast({ title: "Contact Deleted" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
    } finally {
        setContactToDelete(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedContactIds.length === 0) return;
    try {
      await deleteContacts(selectedContactIds);
      setContacts(contacts.filter(c => !selectedContactIds.includes(c.id)));
      toast({ title: `${selectedContactIds.length} Contacts Deleted` });
      setSelectedContactIds([]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    } finally {
        setIsBulkDeleteAlertOpen(false);
    }
  };

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
      if (isEditing) {
          setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
      } else {
          setContacts(prev => [savedContact, ...prev]);
      }
      setIsContactFormOpen(false);
  };

  const handleMergeConfirm = async (sourceContactId: string, masterContactId: string) => {
    try {
        await mergeContacts(sourceContactId, masterContactId);
        setContacts(prev => prev.filter(c => c.id !== sourceContactId));
        toast({ title: "Merge Successful", description: "The contact has been merged and the duplicate was removed." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Merge Failed', description: error.message });
    } finally {
        setIsMergeDialogOpen(false);
        setContactToMerge(null);
    }
  };

  const handleCreateFolder = async () => {
      if (!user || !newFolderName.trim()) return;
      try {
          const newFolder = await addFolder({ name: newFolderName.trim(), userId: user.uid, parentId: newFolderParentId });
          setFolders(prev => [...prev, newFolder]);
          toast({ title: "Folder Created" });
          setIsNewFolderDialogOpen(false);
      } catch (error: any) {
          toast({ variant: "destructive", title: "Failed to create folder", description: error.message });
      }
  };

  const handleOpenNewFolderDialog = (parentId: string | null) => {
      setNewFolderParentId(parentId);
      setNewFolderName('');
      setIsNewFolderDialogOpen(true);
  };

  const handleRoleChange = async (userId: string, email: string, newRole: UserRole) => {
    if (!user) return;
    try {
      await updateUserProfile(userId, email, { role: newRole });
      const contactMatch = contacts.find(c => c.id === userId || c.email === email);
      if (contactMatch) {
          await updateContact(contactMatch.id, { role: newRole });
      }
      toast({ title: 'Authority Updated', description: `User access level changed to ${newRole}.` });
      loadData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  };

  const handleEditUser = (contact: Contact) => {
      const profile = userProfiles.find(p => p.email?.toLowerCase() === contact.email?.toLowerCase() || p.id === contact.id);
      if (profile) {
          setUserToEdit(profile);
          setContactToEdit(null);
          setIsAddUserDialogOpen(true);
      } else {
          setUserToEdit(null);
          setContactToEdit(contact);
          setIsAddUserDialogOpen(true);
      }
  };

  const handleChangePassword = (contact: Contact) => {
      const profile = userProfiles.find(p => p.email?.toLowerCase() === contact.email?.toLowerCase() || p.id === contact.id);
      if (profile) {
          setUserForPasswordChange(profile);
          setIsChangePasswordOpen(true);
      } else {
          toast({ variant: 'destructive', title: 'Profile Not Found', description: "This member doesn't have a login account node yet." });
      }
  };

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case 'admin': return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'editor': return <ShieldCheck className="h-4 w-4 text-primary" />;
      case 'viewer': return <Shield className="h-4 w-4 text-muted-foreground" />;
      case 'none': return <UserX className="h-4 w-4 text-destructive" />;
      default: return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin (Full)';
      case 'editor': return 'Read/Edit';
      case 'viewer': return 'Read Only';
      case 'none': return 'No Access';
      default: return 'Viewer';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <LoaderCircle className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <header className="text-center py-4 sm:py-6 px-4 sm:px-6 relative">
          <h1 className="text-3xl font-bold font-headline text-primary">
            Contacts Hub
          </h1>
          <p className="text-muted-foreground">Manage your contacts, workers, and client relationships</p>
          <div className="absolute top-4 right-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
            </Button>
          </div>
        </header>
        <div className="flex-1 min-h-0 pb-4 sm:pb-6">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
            <ResizablePanel defaultSize={25} minSize={20}>
              <div className="flex h-full flex-col p-2">
                  <div className="p-2">
                      <Button className="w-full" onClick={() => handleOpenNewFolderDialog(null)}>
                          <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                      </Button>
                  </div>
                  <nav className="flex flex-col gap-1 py-2 px-1 overflow-y-auto">
                      <Button
                          variant={selectedFolderId === 'all' ? "secondary" : "ghost"}
                          className="w-full justify-start gap-3"
                          onClick={() => handleSelectFolder('all')}
                      >
                          <Users className="h-4 w-4" />
                          <span>All Contacts</span>
                      </Button>
                      {folders.filter(f => !f.parentId).sort((a,b) => a.name.localeCompare(b.name)).map(folder => (
                        <FolderTreeItem 
                            key={folder.id} 
                            folder={folder} 
                            allFolders={folders} 
                            level={0} 
                            selectedFolderId={selectedFolderId}
                            expandedFolders={expandedFolders}
                            onSelectFolder={handleSelectFolder}
                            onToggleExpand={handleToggleExpand}
                            onRenameStart={(f) => { setRenamingFolder(f); setRenameInputValue(f.name); }}
                            onDrop={handleDrop}
                            onAddSubfolder={handleOpenNewFolderDialog}
                            onDelete={setFolderToDelete}
                            renamingFolderId={renamingFolder?.id || null}
                            renameInputValue={renameInputValue}
                            onRenameChange={setRenameInputValue}
                            onRenameConfirm={handleRenameConfirm}
                            onRenameCancel={() => setRenamingFolder(null)}
                        />
                      ))}
                  </nav>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={75}>
              <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b h-20">
                      <div className="flex items-center gap-3">
                          <div>
                            <h2 className="text-xl font-bold">{selectedFolderId === 'all' ? 'All Contacts' : selectedFolder?.name}</h2>
                            <p className="text-sm text-muted-foreground">{displayedContacts.length} record(s)</p>
                          </div>
                          {isUsersFolderSelected && (
                              <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-10 w-10 text-primary border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-full" onClick={() => setIsSystemRegistryOpen(true)}>
                                              <ShieldCheck className="h-6 w-6" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom"><p>System Team Registry</p></TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          )}
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedContactIds.length > 0 && (
                           <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)}>
                               <Trash2 className="mr-2 h-4 w-4"/> Delete ({selectedContactIds.length})
                           </Button>
                        )}
                        <Button onClick={handleNewActionClick} disabled={selectedFolderId === 'all'}>
                            {isUsersFolderSelected ? <UserPlus className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                            {isUsersFolderSelected ? 'Add App User' : 'New Contact'}
                        </Button>
                      </div>
                  </div>
                   <div className="flex-1 overflow-y-auto">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="w-[50px]">
                                    <Checkbox
                                      onCheckedChange={handleToggleSelectAll}
                                      checked={allVisibleSelected}
                                    />
                                  </TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Email</TableHead>
                                  {isUsersFolderSelected ? <TableHead>Authority</TableHead> : <TableHead>Phone</TableHead>}
                                  {selectedFolderId === 'all' && <TableHead>Folder</TableHead>}
                                  <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {displayedContacts.map((contact) => {
                                const folderName = folders.find(f => f.id === contact.folderId)?.name || 'Unassigned';
                                const primaryPhoneNumber = contact.primaryPhoneType && contact[contact.primaryPhoneType] ? contact[contact.primaryPhoneType] : contact.cellPhone || contact.businessPhone || contact.homePhone;
                                const isMe = contact.id === user?.uid || contact.email === user?.email;

                                return (
                                  <DraggableTableRow 
                                    key={contact.id} 
                                    contact={contact} 
                                    isHighlighted={highlightedId === contact.id}
                                  >
                                      <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedContactIds.includes(contact.id)} onCheckedChange={() => handleToggleSelect(contact.id)} /></TableCell>
                                      <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <button className="text-left hover:underline" onClick={() => isUsersFolderSelected ? handleEditUser(contact) : (setContactToEdit(contact), setIsContactFormOpen(true))}>
                                            {contact.name}
                                            </button>
                                            {isMe && (
                                                <Badge variant="secondary" className="text-[10px] uppercase h-4 px-1.5 bg-primary/10 text-primary border-primary/20">You</Badge>
                                            )}
                                        </div>
                                      </TableCell>
                                      <TableCell>{contact.email}</TableCell>
                                      {isUsersFolderSelected ? (
                                          <TableCell>
                                              <div className="flex items-center gap-2">
                                                  {getRoleIcon(contact.role as UserRole)}
                                                  <span className="text-xs font-medium">{getRoleLabel(contact.role as UserRole)}</span>
                                              </div>
                                          </TableCell>
                                      ) : (
                                          <TableCell>{primaryPhoneNumber}</TableCell>
                                      )}
                                      {selectedFolderId === 'all' && <TableCell>{folderName}</TableCell>}
                                      <TableCell onClick={(e) => e.stopPropagation()}>
                                          <DropdownMenu>
                                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onSelect={() => isUsersFolderSelected ? handleEditUser(contact) : (setContactToEdit(contact), setIsContactFormOpen(true))}>
                                                      <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                                  </DropdownMenuItem>
                                                  
                                                  {isUsersFolderSelected && (
                                                      <>
                                                        <DropdownMenuItem onSelect={() => handleChangePassword(contact)}>
                                                            <KeyRound className="mr-2 h-4 w-4" /> Change Password
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Manage Authority</DropdownMenuLabel>
                                                        <DropdownMenuItem onSelect={() => handleRoleChange(contact.id, contact.email || '', 'admin')}>
                                                            <ShieldAlert className="mr-2 h-4 w-4 text-destructive" /> Admin (Full)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleRoleChange(contact.id, contact.email || '', 'editor')}>
                                                            <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Read/Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleRoleChange(contact.id, contact.email || '', 'viewer')}>
                                                            <Shield className="mr-2 h-4 w-4 text-muted-foreground" /> Read Only
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleRoleChange(contact.id, contact.email || '', 'none')} className="text-destructive">
                                                            <Lock className="mr-2 h-4 w-4" /> No Access
                                                        </DropdownMenuItem>
                                                      </>
                                                  )}

                                                  {!isUsersFolderSelected && (
                                                      <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onSelect={() => { setPreselectedContactId(contact.id); setIsLogTimeDialogOpen(true); }}><Clock className="mr-2 h-4 w-4" /> Log Retrospective Time</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.push(`/master-mind?contactId=${contact.id}`)}><Calendar className="mr-2 h-4 w-4" /> Schedule Task</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.push(`/accounting/invoices/create?contactId=${contact.id}`)}><FileDigit className="mr-2 h-4 w-4" /> Create Invoice</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.push(`/projects/create?contactId=${contact.id}`)}><Briefcase className="mr-2 h-4 w-4" /> Start Project</DropdownMenuItem>
                                                      </>
                                                  )}
                                                  
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onSelect={() => { setContactToMerge(contact); setIsMergeDialogOpen(true); }}><GitMerge className="mr-2 h-4 w-4"/>Merge Duplicate</DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem className="text-destructive" onSelect={() => setContactToDelete(contact)}> <Trash2 className="mr-2 h-4 w-4" />Delete Record</DropdownMenuItem>
                                              </DropdownMenuContent>
                                          </DropdownMenu>
                                      </TableCell>
                                  </DraggableTableRow>
                                );
                              })}
                          </TableBody>
                      </Table>
                  </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
      
      {isContactFormOpen && (
        <ContactFormDialog 
            isOpen={isContactFormOpen} 
            onOpenChange={setIsContactFormOpen} 
            contactToEdit={contactToEdit} 
            initialData={initialContactData}
            selectedFolderId={selectedFolderId} 
            folders={folders} 
            onFoldersChange={setFolders} 
            onSave={handleContactSave} 
            companies={companies} 
            onCompaniesChange={setCompanies} 
            customIndustries={customIndustries} 
            onCustomIndustriesChange={setCustomIndustries} 
        />
      )}

      {isAddUserDialogOpen && (
          <AddUserDialog
            isOpen={isAddUserDialogOpen}
            onOpenChange={setIsAddUserDialogOpen}
            onUserAdded={loadData}
            userToEdit={userToEdit}
            contactToPromote={contactToEdit}
          />
      )}

      <ChangePasswordDialog
        isOpen={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
        user={userForPasswordChange}
        onPasswordChanged={loadData}
      />

      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
            <div className="py-4">
              <Label htmlFor="folder-name-new">Name</Label>
              <Input id="folder-name-new" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter') await handleCreateFolder() }} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder}>Create</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!folderToDelete} onOpenChange={setFolderToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>Delete "{folderToDelete?.name}" and all subfolders and records?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteFolder} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!contactToDelete} onOpenChange={() => setContactToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Permanently delete "{contactToDelete?.name}"?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDeleteContact} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Delete {selectedContactIds.length} record(s)?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">Delete All</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {contactToMerge && (
        <MergeContactsDialog
          isOpen={isMergeDialogOpen}
          onOpenChange={setIsMergeDialogOpen}
          sourceContact={contactToMerge}
          allContacts={contacts}
          onMergeConfirm={handleMergeConfirm}
        />
      )}

      {isLogTimeDialogOpen && (
          <LogTimeDialog
            isOpen={isLogTimeDialogOpen}
            onOpenChange={setIsLogTimeDialogOpen}
            workers={workersForDialog}
            onTimeLogged={loadData}
            preselectedContactId={preselectedContactId}
          />
      )}

      <Dialog open={isSystemRegistryOpen} onOpenChange={setIsSystemRegistryOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="p-6 border-b bg-muted/10 shrink-0">
                  <div className="flex items-center gap-2 text-primary mb-1">
                      <ShieldCheck className="h-6 w-6" />
                      <DialogTitle className="text-2xl font-headline">System Team Registry</DialogTitle>
                  </div>
                  <DialogDescription>
                      Nick's Nodes: Back-end seeded identities. These records are protected and cannot be edited via the UI.
                  </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 p-6">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Identity</TableHead>
                              <TableHead>System Authority</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {systemRegistryContacts.map(c => (
                              <TableRow key={c.id}>
                                  <TableCell>
                                      <div className="flex flex-col">
                                          <span className="font-bold">{c.name}</span>
                                          <span className="text-[10px] text-muted-foreground uppercase">NODE: {c.id.slice(0, 8)}...</span>
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      <div className="flex items-center gap-2">
                                          {getRoleIcon(c.role as UserRole)}
                                          <span className="text-xs font-semibold">{getRoleLabel(c.role as UserRole)}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-tighter">Protected Node</Badge>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </ScrollArea>
              <DialogFooter className="p-4 border-t bg-muted/30">
                  <Button onClick={() => setIsSystemRegistryOpen(false)}>Close Registry</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
