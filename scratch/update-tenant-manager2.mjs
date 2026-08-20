import fs from 'fs';

const file = 'src/app/(app)/tenant-manager/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add updateTenantDetails to imports
content = content.replace(
    "    getTenantDetails,\n} from '@/app/actions/org-actions';",
    "    getTenantDetails,\n    updateTenantDetails,\n} from '@/app/actions/org-actions';"
);

// 2. Add edit state variables
content = content.replace(
    "    const [editName, setEditName] = useState('');",
    "    const [editName, setEditName] = useState('');\n    const [editAdminEmail, setEditAdminEmail] = useState('');\n    const [editAdminName, setEditAdminName] = useState('');\n    const [isLoadingEditDetails, setIsLoadingEditDetails] = useState(false);"
);

// 3. Replace function name and body
content = content.replace('handleEditName', 'handleEditTenant');
content = content.replace(
    "await updateTenantName(editCompany.id, editName.trim());",
    "await updateTenantDetails(editCompany.id, editName.trim(), editAdminEmail.trim(), editAdminName.trim());"
);
content = content.replace(
    "toast({ title: 'Name Updated', description: `Company renamed to \"${editName.trim()}\".` });",
    "toast({ title: 'Tenant Updated', description: `Details updated for \"${editName.trim()}\".` });"
);
content = content.replace(
    "if (!editCompany || !editName.trim()) return;",
    "if (!editCompany || !editName.trim() || !editAdminEmail.trim()) return;"
);

// 4. Replace menu item text
content = content.replace('>Edit Name<', '>Edit<');

// 5. Add admin email/name fetching to the edit menu item onClick
content = content.replace(
    "setEditName(company.name);\n                                                            setIsEditOpen(true);",
    "setEditName(company.name);\n                                                            setEditAdminEmail('');\n                                                            setEditAdminName('');\n                                                            setIsEditOpen(true);\n                                                            setIsLoadingEditDetails(true);\n                                                            getTenantDetails(company.id)\n                                                                .then((details) => {\n                                                                    if (details.users?.[0]) {\n                                                                        setEditAdminEmail(details.users[0].email);\n                                                                        setEditAdminName(details.users[0].displayName || '');\n                                                                    }\n                                                                })\n                                                                .catch((err) => console.error('Failed to load edit details:', err.message))\n                                                                .finally(() => setIsLoadingEditDetails(false));"
);

// 6. Replace dialog title and description
content = content.replace('Edit Company Name', 'Edit Tenant');
content = content.replace(
    'Update the display name for this tenant organization.',
    'Update the company name and admin details for this tenant.'
);

// 7. Replace the dialog content - add admin fields after company name field
content = content.replace(
    '                    <div className="space-y-1.5 py-2">\n                        <Label>Company Name</Label>\n                        <Input\n                            value={editName}\n                            onChange={(e) => setEditName(e.target.value)}\n                            placeholder="Company name"\n                        />\n                    </div>',
    '                    <div className="space-y-4 py-2">\n                        <div className="space-y-1.5">\n                            <Label>Company Name</Label>\n                            <Input\n                                value={editName}\n                                onChange={(e) => setEditName(e.target.value)}\n                                placeholder="Company name"\n                            />\n                        </div>\n                        <div className="space-y-1.5">\n                            <Label>Admin Email</Label>\n                            {isLoadingEditDetails ? (\n                                <div className="flex items-center gap-2 text-sm text-muted-foreground">\n                                    <LoaderCircle className="h-3 w-3 animate-spin" /> Loading...\n                                </div>\n                            ) : (\n                                <Input\n                                    type="email"\n                                    value={editAdminEmail}\n                                    onChange={(e) => setEditAdminEmail(e.target.value)}\n                                    placeholder="admin@company.com"\n                                />\n                            )}\n                        </div>\n                        <div className="space-y-1.5">\n                            <Label>Admin Name</Label>\n                            {isLoadingEditDetails ? (\n                                <div className="flex items-center gap-2 text-sm text-muted-foreground">\n                                    <LoaderCircle className="h-3 w-3 animate-spin" /> Loading...\n                                </div>\n                            ) : (\n                                <Input\n                                    value={editAdminName}\n                                    onChange={(e) => setEditAdminName(e.target.value)}\n                                    placeholder="Admin name"\n                                />\n                            )}\n                        </div>\n                    </div>'
);

// 8. Update dialog cleanup to also clear new state
content = content.replace(
    "setEditCompany(null);\n                    setEditName('');\n                }\n            })",
    "setEditCompany(null);\n                    setEditName('');\n                    setEditAdminEmail('');\n                    setEditAdminName('');\n                }\n            })"
);

// 9. Update the Save button disable condition
content = content.replace(
    "disabled={!editName.trim() || actioningId === editCompany?.id}",
    "disabled={!editName.trim() || !editAdminEmail.trim() || actioningId === editCompany?.id}"
);

fs.writeFileSync(file, content);
console.log('Done - tenant-manager page updated');