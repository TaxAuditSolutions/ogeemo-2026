import fs from 'fs';

const file = 'src/app/(app)/tenant-manager/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add updateTenantDetails to imports
content = content.replace(
    "    deleteTenant,\n    getTenantDetails,\n} from '@/app/actions/org-actions';",
    "    deleteTenant,\n    getTenantDetails,\n    updateTenantDetails,\n} from '@/app/actions/org-actions';"
);

// 2. Add edit state variables after editName
content = content.replace(
    "    const [editName, setEditName] = useState('');",
    "    const [editName, setEditName] = useState('');\n    const [editAdminEmail, setEditAdminEmail] = useState('');\n    const [editAdminName, setEditAdminName] = useState('');\n    const [isLoadingEditDetails, setIsLoadingEditDetails] = useState(false);"
);

// 3. Replace handleEditName with handleEditTenant
content = content.replace(
    `    const handleEditName = async () => {
        if (!editCompany || !editName.trim()) return;
        setActioningId(editCompany.id);
        try {
            await updateTenantName(editCompany.id, editName.trim());
            toast({ title: 'Name Updated', description: \`Company renamed to "\${editName.trim()}".\` });
            setCompanies((prev) =>
                prev.map((c) => (c.id === editCompany.id ? { ...c, name: editName.trim() } : c))
            );
            setIsEditOpen(false);
            setEditCompany(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setActioningId(null);
        }
    };`,
    `    const handleEditTenant = async () => {
        if (!editCompany || !editName.trim() || !editAdminEmail.trim()) return;
        setActioningId(editCompany.id);
        try {
            await updateTenantDetails(editCompany.id, editName.trim(), editAdminEmail.trim(), editAdminName.trim());
            toast({ title: 'Tenant Updated', description: \`Details updated for "\${editName.trim()}".\` });
            setCompanies((prev) =>
                prev.map((c) => (c.id === editCompany.id ? { ...c, name: editName.trim() } : c))
            );
            setIsEditOpen(false);
            setEditCompany(null);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        } finally {
            setActioningId(null);
        }
    };`
);

// 4. Replace the Edit Name menu item with Edit that fetches details
content = content.replace(
    `                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditCompany(company);
                                                            setEditName(company.name);
                                                            setIsEditOpen(true);
                                                        }}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit Name
                                                    </DropdownMenuItem>`,
    `                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditCompany(company);
                                                            setEditName(company.name);
                                                            setEditAdminEmail('');
                                                            setEditAdminName('');
                                                            setIsEditOpen(true);
                                                            setIsLoadingEditDetails(true);
                                                            getTenantDetails(company.id)
                                                                .then((details) => {
                                                                    if (details.users?.[0]) {
                                                                        setEditAdminEmail(details.users[0].email);
                                                                        setEditAdminName(details.users[0].displayName || '');
                                                                    }
                                                                })
                                                                .catch((err) => console.error('Failed to load edit details:', err.message))
                                                                .finally(() => setIsLoadingEditDetails(false));
                                                        }}
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>`
);

// 5. Replace the Edit Name dialog with full Edit dialog
content = content.replace(
    `            {/* Edit Name Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(open) => {
                setIsEditOpen(open);
                if (!open) {
                    setEditCompany(null);
                    setEditName('');
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Company Name</DialogTitle>
                        <DialogDescription>
                            Update the display name for this tenant organization.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1.5 py-2">
                        <Label>Company Name</Label>
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Company name"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditName} disabled={!editName.trim() || actioningId === editCompany?.id}>
                            {actioningId === editCompany?.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>`,
    `            {/* Edit Tenant Dialog */}
            <Dialog open={isEditOpen} onOpenChange={(open) => {
                setIsEditOpen(open);
                if (!open) {
                    setEditCompany(null);
                    setEditName('');
                    setEditAdminEmail('');
                    setEditAdminName('');
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Tenant</DialogTitle>
                        <DialogDescription>
                            Update the company name and admin details for this tenant.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Company Name</Label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Company name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Admin Email</Label>
                            {isLoadingEditDetails ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <LoaderCircle className="h-3 w-3 animate-spin" /> Loading...
                                </div>
                            ) : (
                                <Input
                                    type="email"
                                    value={editAdminEmail}
                                    onChange={(e) => setEditAdminEmail(e.target.value)}
                                    placeholder="admin@company.com"
                                />
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Admin Name</Label>
                            {isLoadingEditDetails ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <LoaderCircle className="h-3 w-3 animate-spin" /> Loading...
                                </div>
                            ) : (
                                <Input
                                    value={editAdminName}
                                    onChange={(e) => setEditAdminName(e.target.value)}
                                    placeholder="Admin name"
                                />
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditTenant} disabled={!editName.trim() || !editAdminEmail.trim() || actioningId === editCompany?.id}>
                            {actioningId === editCompany?.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>`
);

fs.writeFileSync(file, content);
console.log('Done - tenant-manager page updated');