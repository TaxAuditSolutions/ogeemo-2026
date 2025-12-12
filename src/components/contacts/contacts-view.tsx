
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useDrag, useDrop } from 'react-dnd';
import {
  Folder,
  File as FileIconLucide,
  LoaderCircle,
  FolderPlus,
  ChevronRight,
  ExternalLink,
  MoreVertical,
  Pencil,
  Trash2,
  BookOpen,
  Link as LinkIcon,
  Info,
  Files,
  FilePlus,
  FileText,
  Sheet,
  Presentation,
  Users,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Contact } from '@/data/contacts';
import { type FolderData } from '@/services/contact-folder-service';
import { useToast } from '@/hooks/use-toast';
import { getContacts, deleteContacts, updateContact } from '@/services/contact-service';
import { getCompanies, addCompany, type Company } from '@/services/accounting-service';
import { getFolders, addFolder, updateFolder, deleteFolders } from '@/services/contact-folder-service';
import { getIndustries, type Industry } from '@/services/industry-service';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import Link from 'next/link';

const ContactFormDialog = dynamic(() => import('@/components/contacts/contact-form-dialog'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <LoaderCircle className="h-10 w-10 animate-spin text-white" />
    </div>
  ),
});

const ItemTypes = {
  CONTACT: 'contact',
  FOLDER: 'folder',
};

type DroppableItem = (Contact & { type?: 'contact' }) | (FolderData & { type: 'folder' });


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

  const { toast } = useToast();
  const { user } = useAuth();
  
  useEffect(() => {
    async function loadData() {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [fetchedFolders, fetchedContacts, fetchedCompanies, fetchedIndustries] = await Promise.all([
                getFolders(user.uid),
                getContacts(user.uid),
                getCompanies(user.uid),
                getIndustries(user.uid),
            ]);
            setFolders(fetchedFolders);
            setContacts(fetchedContacts);
            setCompanies(fetchedCompanies);
            setCustomIndustries(fetchedIndustries);

            const rootFolder = fetchedFolders.find(f => !f.parentId);
            if(rootFolder) {
              setExpandedFolders(new Set([rootFolder.id]));
            }
        } catch (error: any) {
            console.error("Failed to load contact data:", error);
            toast({
                variant: "destructive",
                title: "Failed to load data",
                description: error.message || "Could not retrieve contacts and folders from the database.",
            });
        } finally {
            setIsLoading(false);
        }
    }
    loadData();
  }, [toast, user]);

  const selectedFolder = useMemo(
    () => folders.find((f) => f && f.id === selectedFolderId),
    [folders, selectedFolderId]
  );

  const displayedContacts = useMemo(
    () => {
        if (selectedFolderId === 'all') return contacts;
        const getDescendantFolderIds = (folderId: string): string[] => {
            let ids = [folderId];
            const children = folders.filter(f => f.parentId === folderId);
            children.forEach(child => {
                ids = [...ids, ...getDescendantFolderIds(child.id)];
            });
            return ids;
        };

        const folderIdsToDisplay = getDescendantFolderIds(selectedFolderId);
        return contacts.filter((c) => folderIdsToDisplay.includes(c.folderId));
    },
    [contacts, folders, selectedFolderId]
  );
  
  const handleNewContactClick = useCallback(() => {
    if (selectedFolderId === 'all' && folders.length > 0) {
      toast({ variant: "destructive", title: "Folder Required", description: "Please select a specific folder before adding a new contact." });
      return;
    }
    setContactToEdit(null);
    setIsContactFormOpen(true);
  }, [selectedFolderId, folders.length, toast]);
  

  const allVisibleSelected = displayedContacts.length > 0 && selectedContactIds.length === displayedContacts.length;
  const someSelected = useMemo(() => selectedContactIds.length > 0 && !allVisibleSelected, [selectedContactIds, allVisibleSelected]);

  const handleToggleSelect = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleToggleSelectAll = () => {
    setSelectedContactIds(allVisibleSelected ? [] : displayedContacts.map(c => c.id));
  };
  
  const handleSaveContact = (savedContact: Contact, isEditing: boolean) => {
      if (isEditing) {
          setContacts(prev => prev.map(c => c.id === savedContact.id ? savedContact : c));
      } else {
          setContacts(prev => [...prev, savedContact]);
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

  const handleDeleteSelected = async () => {
    if (!user || selectedContactIds.length === 0) return;
    
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
  
  const handleDeleteFolder = (folder: FolderData) => {
      setFolderToDelete(folder);
  };
  

  const handleConfirmDeleteFolder = async () => {
    if (!user || !folderToDelete) return;
    
    const allFoldersIncludingChildren = (function getDescendants(parentId: string, all: FolderData[]): string[] {
        const children = all.filter(f => f.parentId === parentId).map(f => f.id);
        return [parentId, ...children.flatMap(childId => getDescendants(childId, all))];
    })(folderToDelete.id, folders);

    try {
        const filesToDelete = contacts.filter(f => allFoldersIncludingChildren.includes(f.folderId));
        if (filesToDelete.length > 0) {
            await deleteContacts(filesToDelete.map(f => f.id));
        }

        await deleteFolders(allFoldersIncludingChildren);
        
        setFolders(prev => prev.filter(f => !allFoldersIncludingChildren.includes(f.id)));
        setContacts(prev => prev.filter(c => !allFoldersIncludingChildren.includes(c.folderId)));
        
        if (allFoldersIncludingChildren.includes(selectedFolderId)) setSelectedFolderId('all');
        
        toast({ title: "Folder and its contents deleted" });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Delete Failed", description: error.message });
    } finally {
        setFolderToDelete(null);
    }
  };


  const handleStartRename = (folder: FolderData) => {
    setRenamingFolder(folder);
    setRenameInputValue(folder.name);
  };

  const handleCancelRename = () => {
    setRenamingFolder(null);
    setRenameInputValue("");
  };

  const handleConfirmRename = async () => {
    if (!renamingFolder || !renameInputValue.trim() || renamingFolder.name === renameInputValue.trim()) {
      handleCancelRename();
      return;
    }

    try {
      await updateFolder(renamingFolder.id, { name: renameInputValue.trim() });
      setFolders(prev => prev.map(f => f.id === renamingFolder.id ? { ...f, name: renameInputValue.trim() } : f));
      toast({ title: "Folder Renamed" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Rename Failed", description: error.message });
    } finally {
      handleCancelRename();
    }
  };
  
  const handleContactDrop = async (contact: Contact, newFolderId: string) => {
    if (contact.folderId === newFolderId) return;

    try {
        const updatedContactData = { ...contact, folderId: newFolderId };
        await updateContact(contact.id, { folderId: newFolderId });
        setContacts(prev => prev.map(c => c.id === contact.id ? updatedContactData : c));
        const folder = folders.find(f => f.id === newFolderId);
        toast({ title: "Contact Moved", description: `"${contact.name}" moved to "${folder?.name}".` });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Move Failed", description: error.message });
    }
  };

  const handleFolderDrop = async (folder: FolderData, newParentId: string | null) => {
    if (folder.id === newParentId) return; // Can't drop on self
    if (folder.parentId === newParentId) return; // Already in the target folder

    // Prevent dropping a folder into one of its own descendants
    let currentParentId = newParentId;
    while(currentParentId) {
        if (currentParentId === folder.id) {
            toast({ variant: "destructive", title: "Invalid Move", description: "You cannot move a folder into one of its own subfolders." });
            return;
        }
        const parent = folders.find(f => f.id === currentParentId);
        currentParentId = parent?.parentId || null;
    }

    try {
        await updateFolder(folder.id, { parentId: newParentId });
        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, parentId: newParentId } : f));
        const parentFolder = folders.find(f => f.id === newParentId);
        toast({ title: "Folder Moved", description: `"${folder.name}" moved to "${parentFolder?.name || 'Root'}".` });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Move Failed", description: error.message });
    }
  };

  const DraggableTableRow = ({ contact, children }: { contact: Contact, children: React.ReactNode }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.CONTACT,
        item: contact,
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }));
    return (
      <TableRow ref={drag} className={cn(isDragging && "opacity-50", "cursor-grab")}>
        {children}
      </TableRow>
    );
  };

  const handleSelectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedContactIds([]);
  };

  const handleOpenNewFolderDialog = (parentId: string | null) => {
    setNewFolderParentId(parentId);
    setNewFolderName('');
    setIsNewFolderDialogOpen(true);
  };
  
  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return;
    try {
        const newFolder = await addFolder({ name: newFolderName.trim(), userId: user.uid, parentId: newFolderParentId });
        onFoldersChange([...folders, newFolder]);
        handleSelectFolder(newFolder.id);
    } catch(e: any) { toast({ variant: "destructive", title: "Failed", description: (e as Error).message }); }
    finally { setIsNewFolderDialogOpen(false); setNewFolderName(""); }
  };

  const FolderTreeItem = ({ folder, allFolders, level = 0 }: { folder: FolderData, allFolders: FolderData[], level?: number }) => {
    const hasChildren = allFolders.some(f => f.parentId === folder.id);
    const isExpanded = expandedFolders.has(folder.id);
    const isRenaming = renamingFolder?.id === folder.id;

    const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
      type: ItemTypes.FOLDER,
      item: { ...folder, type: ItemTypes.FOLDER },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }));

    const [{ canDrop, isOver }, drop] = useDrop(() => ({
      accept: [ItemTypes.CONTACT, ItemTypes.FOLDER],
      drop: (item: DroppableItem) => {
        if (item.type === ItemTypes.FOLDER) {
          handleFolderDrop(item, folder.id);
        } else {
          handleContactDrop(item, folder.id);
        }
      },
      collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    }));

    return (
      <div style={{ marginLeft: level > 0 ? `${level * 1}rem` : '0' }} className="my-1 rounded-md" ref={dragPreview}>
        <div
          ref={node => drag(drop(node))}
          className={cn(
            "flex items-center justify-between rounded-md h-9",
            isRenaming ? 'bg-background' : 'hover:bg-accent',
            (isOver && canDrop) && 'bg-primary/20 ring-1 ring-primary',
            isDragging && 'opacity-50',
            selectedFolderId === folder.id && !isRenaming && 'bg-accent'
          )}
        >
            <div className="flex-1 flex items-center min-w-0 h-full pl-1 cursor-pointer" onClick={() => !isRenaming && handleSelectFolder(folder.id)}>
                {hasChildren ? (
                  <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-90')} onClick={(e) => { e.stopPropagation(); setExpandedFolders(p => { const n = new Set(p); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; }); }} />
                ) : (
                  <div className="w-4 h-4 shrink-0" />
                )}
                <Folder className="h-4 w-4 text-primary ml-1 shrink-0" />
                {isRenaming ? (
                  <Input autoFocus value={renameInputValue} onChange={e => setRenameInputValue(e.target.value)} onBlur={handleConfirmRename} onKeyDown={e => { if (e.key === 'Enter') handleConfirmRename(); if (e.key === 'Escape') handleCancelRename(); }} className="h-7" onClick={e => e.stopPropagation()} />
                ) : (
                  <span className="truncate ml-2 text-sm">{folder.name}</span>
                )}
            </div>
            <div className="flex items-center">
                {folder.driveLink && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); window.open(folder.driveLink!, '_blank', 'noopener,noreferrer'); }}>
                    <ExternalLink className="h-4 w-4 text-blue-500" />
                  </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 px-1.5">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onSelect={() => handleOpenNewFolderDialog(folder.id)}><FolderPlus className="mr-2 h-4 w-4" />Create subfolder</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleStartRename(folder)}><Pencil className="mr-2 h-4 w-4" />Rename</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
            </div>
        </div>
        {isExpanded && allFolders.filter(f => f.parentId === folder.id).sort((a,b) => a.name.localeCompare(b.name)).map(child => (
          <FolderTreeItem key={child.id} folder={child} allFolders={allFolders} level={level + 1} />
        ))}
      </div>
    );
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
        <header className="text-center py-4 sm:py-6 px-4 sm:px-6">
          <h1 className="text-3xl font-bold font-headline text-primary">
            Ogeemo Contact Manager
          </h1>
          <p className="text-muted-foreground">
            Manage your contacts and client relationships
          </p>
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
                  <nav className="flex flex-col gap-1 py-2 px-1">
                      <Button
                          variant={selectedFolderId === 'all' ? "secondary" : "ghost"}
                          className="w-full justify-start gap-3"
                          onClick={() => handleSelectFolder('all')}
                      >
                          <Users className="h-4 w-4" />
                          <span>All Contacts</span>
                      </Button>
                      {folders.filter(f => !f.parentId).sort((a,b) => a.name.localeCompare(b.name)).map(folder => (
                        <FolderTreeItem key={folder.id} folder={folder} allFolders={folders} />
                      ))}
                  </nav>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={75}>
              <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b h-20">
                      <div>
                          <h2 className="text-xl font-bold">{selectedFolderId === 'all' ? 'All Contacts' : selectedFolder?.name}</h2>
                          <p className="text-sm text-muted-foreground">{displayedContacts.length} contact(s)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedContactIds.length > 0 ? (
                           <Button variant="destructive" onClick={() => setIsBulkDeleteAlertOpen(true)}>
                               <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedContactIds.length})
                           </Button>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button onClick={handleNewContactClick} disabled={selectedFolderId === 'all'}>
                                  <Plus className="mr-2 h-4 w-4" /> Add Contact
                                </Button>
                              </TooltipTrigger>
                              {selectedFolderId === 'all' && (
                                <TooltipContent>
                                  <p>Please select a specific folder to add a contact.</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                  </div>
                   <div className="flex-1 overflow-y-auto">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="w-[50px]">
                                    <Checkbox
                                      checked={allVisibleSelected ? true : (someSelected ? 'indeterminate' : false)}
                                      onCheckedChange={() => handleToggleSelectAll()}
                                    />
                                  </TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Company</TableHead>
                                  <TableHead>Phone</TableHead>
                                  {selectedFolderId === 'all' && <TableHead>Folder</TableHead>}
                                  <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {displayedContacts.map((contact) => {
                                const folderName = folders.find(f => f.id === contact.folderId)?.name || 'Unassigned';
                                const primaryPhoneNumber = contact.primaryPhoneType && contact[contact.primaryPhoneType] ? contact[contact.primaryPhoneType] : contact.cellPhone || contact.businessPhone || contact.homePhone;
                                return (
                                  <DraggableTableRow key={contact.id} contact={contact}>
                                      <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedContactIds.includes(contact.id)} onCheckedChange={() => handleToggleSelect(contact.id)} /></TableCell>
                                      <TableCell className="font-medium">
                                        <button 
                                          className="text-left hover:underline" 
                                          onClick={() => { setContactToEdit(contact); setIsContactFormOpen(true); }}
                                        >
                                          {contact.name}
                                        </button>
                                      </TableCell>
                                      <TableCell>{contact.email}</TableCell>
                                      <TableCell>{contact.businessName}</TableCell>
                                      <TableCell>{primaryPhoneNumber}</TableCell>
                                      {selectedFolderId === 'all' && <TableCell>{folderName}</TableCell>}
                                      <TableCell onClick={(e) => e.stopPropagation()}>
                                          <DropdownMenu>
                                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onSelect={() => { setContactToEdit(contact); setIsContactFormOpen(true); }}><BookOpen className="mr-2 h-4 w-4" />Open</DropdownMenuItem>
                                                  <DropdownMenuItem onSelect={() => { setContactToEdit(contact); setIsContactFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); setContactToDelete(contact); }}> <Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
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
      
      {isContactFormOpen && <ContactFormDialog isOpen={isContactFormOpen} onOpenChange={setIsContactFormOpen} contactToEdit={contactToEdit} selectedFolderId={selectedFolderId} folders={folders} onFoldersChange={setFolders} onSave={handleSaveContact} companies={companies} onCompaniesChange={setCompanies} customIndustries={customIndustries} onCustomIndustriesChange={setCustomIndustries} />}

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
      
      <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This will permanently delete the folder "{folderToDelete?.name}" and all of its subfolders and contacts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteFolder} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!contactToDelete} onOpenChange={() => setContactToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action will permanently delete the contact "{contactToDelete?.name}". This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmDeleteContact} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete {selectedContactIds.length} contact(s). This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
