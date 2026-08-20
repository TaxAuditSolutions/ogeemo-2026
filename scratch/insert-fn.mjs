import fs from 'fs';

const file = 'src/app/actions/org-actions.ts';
let content = fs.readFileSync(file, 'utf8');

const newFunc = `/**
 * Master Tenant (Ogeemo) only: updates a tenant's company name and admin details.
 */
export async function updateTenantDetails(orgId: string, newCompanyName: string, newAdminEmail: string, newAdminName: string): Promise<void> {
    await requireMasterTenantSuperAdmin();
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    if (!adminAuth || !adminDb) throw new Error('Firebase Admin SDK is not initialized.');

    const orgRef = adminDb.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) throw new Error('Organization not found.');
    if (orgSnap.data()?.isMasterTenant === true) throw new Error('Cannot modify the master tenant.');

    const ownerUid = orgSnap.data()?.ownerUid as string | null;
    if (!ownerUid) throw new Error('Tenant has no owner UID assigned.');

    // 1. Update org name
    await orgRef.update({
        name: newCompanyName.trim(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    // 2. Update admin auth user (email + displayName)
    await adminAuth.updateUser(ownerUid, {
        email: newAdminEmail.trim(),
        displayName: newAdminName.trim(),
    });

    // 3. Update admin Firestore profile
    await adminDb.collection('users').doc(ownerUid).update({
        email: newAdminEmail.trim(),
        displayName: newAdminName.trim(),
        updatedAt: FieldValue.serverTimestamp(),
    });
}

`;

// Insert before updateTenantStatus
content = content.replace(
    'export async function updateTenantStatus',
    newFunc + 'export async function updateTenantStatus'
);

fs.writeFileSync(file, content);
console.log('Done - updateTenantDetails inserted');