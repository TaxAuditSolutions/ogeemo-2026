
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
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
  GitMerge,
  Pencil,
  Files,
  Check,
  ChevronsUpDown,
  X,
  Mail,
  Calendar,
  FileDigit,
  Briefcase,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type Contact } from '@/data/contacts';
import { useToast } from '@/hooks/use-toast';
import { getContacts, deleteContacts, updateContact, addContact } from '@/services/contact-service';
import { getFolders, addFolder, updateFolder, deleteFolders, ensureSystemFolders, type FolderData } from '@/services/contact-folder-service';
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
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { LogTimeDialog } from '@/components/reports/log-time-dialog';
import { getWorkers, type Worker } from '@/services/payroll-service';
import { ScrollArea } from '@/components/ui/scroll-area';

const ContactFormDialog = dynamic(() => import('@/components/contacts/contact-form-dialog'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><LoaderCircle className="h-10 w-10 animate-spin text-white" /></div>,
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
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.CONTACT,
        item: contact,
        collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }, [contact]);

    return (
      <DraggableTableRowInner 
        id={`row-${contact.id}`} 
        ref={drag} 
        className={cn(
            isDragging && "opacity-50", 
            isHighlighted && "bg-primary/10 animate-pulse ring-2 ring-primary ring-inset", 
            "cursor-grab"
        )}
      >
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

    const [{ isDragging }, drag] = useDrag({
      type: ItemTypes.FOLDER,
      item: { ...folder, type: 'folder' },
      canDrag: !isRenaming && !isSystem,
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }, [folder, isRenaming, isSystem]);

    const [{ canDrop, isOver }, drop] = useDrop({
      accept: [ItemTypes.CONTACT, ItemTypes.FOLDER],
      drop: (item: DroppableItem) => onDrop(item, folder.id),
      collect: (monitor) => ({ isOver: !!monitor.isOver(), canDrop: !!monitor.canDrop() }),
    }, [folder.id, onDrop]);

    return (
      <div style={{ marginLeft: level > 0 ? `${level * 1}rem` : '0' }} className="my-1 rounded-md">
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
                allFolders={allFolders} 
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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customIndustries, setCustomIndustries] = useState<Industry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [renamingFolder, setRenamingFolder] = useState<FolderData | null>(null);
  const [renameInputValue, setRenameInputValue] = useState("");
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderData | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
  const [preselectedContactId, setPreselectedContactId] = useState<string | null>(null);
  const [workersForDialog, setWorkersForSelection] = useState<Worker[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedId = searchParams ? searchParams.get('highlight') : null;
  const fileRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const loadData = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
        const allFolders = await ensureSystemFolders(user.uid);
        const [fetchedContacts, fetchedCompanies, fetchedIndustries, fetchedWorkers] = await Promise.all([
            getContacts(), 
            getCompanies(user.uid),
            getIndustries(user.uid),
            getWorkers(), // Organization-wide retrieval
        ]);
        setContacts(fetchedContacts);
        setFolders(allFolders);
        setCompanies(fetchedCompanies);
        setCustomIndustries(fetchedIndustries);
        setWorkersForSelection(fetchedWorkers);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleContactSave = (savedContact: Contact, isEditing: boolean) => {
    if (isEditing) {
        setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
    } else {
        setContacts(prev => [savedContact, ...prev]);
    }
    setIsContactFormOpen(false);
  };

  const displayedContacts = useMemo(() => {
    if (selectedFolderId === 'all') return contacts;
    const getDescendantFolderIds = (folderId: string): string[] => {
        let ids = [folderId];
        folders.filter(f => f.parentId === folderId).forEach(child => {
            ids = [...ids, ...getDescendantFolderIds(child.id)];
        });
        return ids;
    };
    const folderIds = getDescendantFolderIds(selectedFolderId);
    return contacts.filter((c) => folderIds.includes(c.folderId));
  }, [contacts, folders, selectedFolderId]);

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
        } catch (error: any) { toast({ variant: "destructive", title: "Move Failed", description: error.message }); }
    } else {
        if (item.parentId === newFolderId) return;
        const folder = folders.find(f => f.id === item.id);
        if (folder?.isSystem) { toast({ variant: 'destructive', title: 'Protected Folder', description: 'System folders cannot be moved.' }); return; }
        try {
            await updateFolder(item.id, { parentId: newFolderId });
            setFolders(prev => prev.map(f => f.id === item.id ? { ...f, parentId: newFolderId } : f));
            toast({ title: "Folder Moved" });
        } catch (error: any) { toast({ variant: "destructive", title: "Move Failed", description: error.message }); }
    }
  }, [user, toast, folders]);

  const handleRenameConfirm = useCallback(async () => {
    if (!renamingFolder || !renameInputValue.trim() || renamingFolder.name === renameInputValue.trim()) { setRenamingFolder(null); return; }
    try {
      await updateFolder(renamingFolder.id, { name: renameInputValue.trim() });
      setFolders(prev => prev.map(f => f.id === renamingFolder.id ? { ...f, name: renameInputValue.trim() } : f));
      toast({ title: "Folder Renamed" });
    } catch (error: any) { toast({ variant: "destructive", title: "Rename Failed", description: error.message }); }
    finally { setRenamingFolder(null); }
  }, [renamingFolder, renameInputValue, toast]);

  const handleConfirmDeleteFolder = async () => {
    if (!user || !folderToDelete) return;
    try {
        await deleteFolders([folderToDelete.id]);
        setFolders(prev => prev.filter(f => f.id !== folderToDelete.id));
        if (selectedFolderId === folderToDelete.id) setSelectedFolderId('all');
        toast({ title: "Folder Deleted" });
    } catch (error: any) { toast({ variant: "destructive", title: "Delete Failed", description: error.message }); }
    finally { setFolderToDelete(null); }
  };

  const handleConfirmDeleteContact = async () => {
    if (!contactToDelete) return;
    try {
        await deleteContacts([contactToDelete.id]);
        setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
        toast({ title: "Contact Deleted" });
    } catch (error: any) { toast({ variant: 'destructive', title: 'Delete Failed', description: error.message }); }
    finally { setContactToDelete(null); }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedContactIds.length === 0) return;
    try {
      await deleteContacts(selectedContactIds);
      setContacts(contacts.filter(c => !selectedContactIds.includes(c.id)));
      toast({ title: `${selectedContactIds.length} Contacts Deleted` });
      setSelectedContactIds([]);
    } catch (error: any) { toast({ variant: "destructive", title: "Delete Failed", description: error.message }); }
    finally { setIsBulkDeleteAlertOpen(false); }
  };

  const handleCreateFolder = async () => {
      if (!user || !newFolderName.trim()) return;
      try {
          const newFolder = await addFolder({ name: newFolderName.trim(), userId: user.uid, parentId: newFolderParentId });
          setFolders(prev => [...prev, newFolder]);
          toast({ title: "Folder Created" });
          setIsNewFolderDialogOpen(false);
      } catch (error: any) { toast({ variant: "destructive", title: "Error", description: error.message }); }
  };

  useEffect(() => {
    if (highlightedId && !isLoading && contacts.length > 0) {
        const contact = contacts.find(c => c.id === highlightedId);
        if (contact) {
            const timeoutId = setTimeout(() => {
                const rowElement = document.getElementById(`row-${highlightedId}`);
                if (rowElement) {
                    rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }
  }, [highlightedId, isLoading, contacts]);

  if (isLoading) return <div className="flex h-full w-full items-center justify-center p-4"><LoaderCircle className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <>
      <div className="flex flex-col h-full text-black">
        <header className="text-center py-4 sm:py-6 px-4 sm:px-6 relative">
          <h1 className="text-3xl font-bold font-headline text-primary">Contacts Hub</h1>
          <p className="text-muted-foreground">Manage your relationships and folders</p>
          <div className="absolute top-4 right-4"><Button variant="ghost" size="icon" onClick={() => router.back()}><X className="h-5 w-5" /></Button></div>
        </header>
        <div className="flex-1 min-h-0 pb-4 sm:pb-6 px-4 sm:px-6">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
            <ResizablePanel defaultSize={20} minSize={15}>
              <div className="flex h-full flex-col p-2">
                  <div className="p-2"><Button className="w-full" onClick={() => { setNewFolderParentId(null); setNewFolderName(''); setIsNewFolderDialogOpen(true); }}><FolderPlus className="mr-2 h-4 w-4" /> New Folder</Button></div>
                  <nav className="flex flex-col gap-1 py-2 px-1 overflow-y-auto">
                      <Button variant={selectedFolderId === 'all' ? "secondary" : "ghost"} className="w-full justify-start gap-3" onClick={() => handleSelectFolder('all')}><Users className="h-4 w-4" /><span>All Contacts</span></Button>
                      {folders.filter(f => !f.parentId).sort((a,b) => a.name.localeCompare(b.name)).map(folder => (
                        <FolderTreeItem 
                            key={folder.id} folder={folder} allFolders={folders} level={0} selectedFolderId={selectedFolderId} expandedFolders={expandedFolders}
                            onSelectFolder={handleSelectFolder} onToggleExpand={handleToggleExpand} onRenameStart={(f) => { setRenamingFolder(f); setRenameInputValue(f.name); }}
                            onDrop={handleDrop} onAddSubfolder={(pid) => { setNewFolderParentId(pid); setNewFolderName(''); setIsNewFolderDialogOpen(true); }} onDelete={setFolderToDelete}
                            renamingFolderId={renamingFolder?.id || null} renameInputValue={renameInputValue} onRenameChange={setRenameInputValue} onRenameConfirm={handleRenameConfirm} onRenameCancel={() => setRenamingFolder(null)}
                        />
                      ))}
                  </nav>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={80}>
              <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b h-20">
                      <div><h2 className="text-xl font-bold">{selectedFolderId === 'all' ? 'All Contacts' : folders.find(f => f.id === selectedFolderId)?.name}</h2><p className="text-sm text-muted-foreground">{displayedContacts.length} record(s)</p></div>
                      <div className="flex items-center gap-2">
                        {selectedContactIds.length > 0 && <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)}><Trash2 className="mr-2 h-4 w-3" /> Delete ({selectedContactIds.length})</Button>}
                        <Button onClick={() => { setContactToEdit(null); setIsContactFormOpen(true); }} disabled={selectedFolderId === 'all'}><Plus className="mr-2 h-4 w-4" /> New Contact</Button>
                      </div>
                  </div>
                   <div className="flex-1 overflow-auto">
                      <Table className="min-w-[800px]">
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="w-[50px]"><Checkbox onCheckedChange={(checked) => setSelectedContactIds(checked ? displayedContacts.map(c => c.id) : [])} checked={allVisibleSelected}/></TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Phone</TableHead>
                                  {selectedFolderId === 'all' && <TableHead>Folder</TableHead>}
                                  <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {displayedContacts.map((contact) => (
                                  <DraggableTableRow key={contact.id} contact={contact} isHighlighted={highlightedId === contact.id}>
                                      <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedContactIds.includes(contact.id)} onCheckedChange={(checked) => setSelectedContactIds(prev => checked ? [...prev, contact.id] : prev.filter(id => id !== contact.id))} /></TableCell>
                                      <TableCell className="font-medium">
                                          <div className="flex items-center">
                                              <button className="text-left hover:underline" onClick={() => { setContactToEdit(contact); setIsContactFormOpen(true); }}>{contact.name}</button>
                                          </div>
                                      </TableCell>
                                      <TableCell>{contact.email}</TableCell>
                                      <TableCell>{contact.cellPhone || contact.businessPhone || contact.homePhone || '-'}</TableCell>
                                      {selectedFolderId === 'all' && <TableCell>{folders.find(f => f.id === contact.folderId)?.name || 'Unassigned'}</TableCell>}
                                      <TableCell onClick={(e) => e.stopPropagation()} className="w-[50px]">
                                          <DropdownMenu>
                                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onSelect={() => { setContactToEdit(contact); setIsContactFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onClick={() => { setPreselectedContactId(contact.id); setIsLogTimeDialogOpen(true); }}><Clock className="mr-2 h-4 w-4" /> Log Time</DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => router.push(`/master-mind?contactId=${contact.id}`)}><Calendar className="mr-2 h-4 w-4" /> Schedule Task</DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => router.push(`/accounting/invoices/create?contactId=${contact.id}`)}><FileDigit className="mr-2 h-4 w-4" /> Create Invoice</DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => router.push(`/projects/create?contactId=${contact.id}`)}><Briefcase className="mr-2 h-4 w-4" /> Start Project</DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.stopPropagation(); setContactToDelete(contact); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                              </DropdownMenuContent>
                                          </DropdownMenu>
                                      </TableCell>
                                  </DraggableTableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
      
      {isContactFormOpen && <ContactFormDialog isOpen={isContactFormOpen} onOpenChange={setIsContactFormOpen} contactToEdit={contactToEdit} selectedFolderId={selectedFolderId} folders={folders} onFoldersChange={setFolders} onSave={handleContactSave} companies={companies} onCompaniesChange={setCompanies} customIndustries={customIndustries} onCustomIndustriesChange={setCustomIndustries} />}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader><div className="py-4"><Label>Name</Label><Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }} /></div><DialogFooter><Button variant="ghost" onClick={() => setIsNewFolderDialogOpen(false)}>Cancel</Button><Button onClick={handleCreateFolder}>Create</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!folderToDelete} onOpenChange={setFolderToDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Folder?</AlertDialogTitle><AlertDialogDescription>This will remove the folder and its references. Contacts are not deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteFolder} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!contactToDelete} onOpenChange={setContactToDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Contact?</AlertDialogTitle><AlertDialogDescription>Permanently remove "{contactToDelete?.name}"?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteContact} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Selected?</AlertDialogTitle><AlertDialogDescription>Delete {selectedContactIds.length} records?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">Delete All</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      {isLogTimeDialogOpen && <LogTimeDialog isOpen={isLogTimeDialogOpen} onOpenChange={setIsLogTimeDialogOpen} workers={workersForDialog} onTimeLogged={loadData} preselectedContactId={preselectedContactId} />}
    </>
  );
}
