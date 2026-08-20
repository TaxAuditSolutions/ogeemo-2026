# Ogeemo Tenant Management — Instructions for Nick & Julie

## Overview

Ogeemo uses a multi-tenant architecture. There are two types of organizations:

1. **Master Tenant** (`ogeemo-master`) — This is the Ogeemo platform owner organization. Super admins on the master tenant can provision and manage all subscriber companies.
2. **Subscriber Tenants** — These are the companies that sign up to use Ogeemo. Each tenant is fully isolated with its own data, users, and settings.

---

## Part 1: Getting Owner Access

### Who Currently Has Access

The following users already have master-tenant super admin access:

| Email | Access Level | Master Tenant | Status |
|------|-------------|----------------|--------|
| `nick@taxauditsolutions.com` | super_admin | Yes | Working |
| `dan.white@taxauditsolutions.com` | super_admin | Yes | Working |
| `dan@danwhite.ca` | super_admin | Yes | Working |

### If Julie Needs Owner Access

Julie's accounts currently have **no custom claims set**. To grant Julie master-tenant super admin access, Dan (or anyone with terminal access) needs to run:

```bash
npx tsx scripts/promote-to-super-admin.ts julie@juliewhite.ca
```

After running the script, Julie must:
1. **Log out** of the app
2. **Log back in** (this refreshes her auth token with the new claims)
3. Navigate to `localhost:9002/owner` to access the Owner Console

> **Important:** The script sets three custom claims on the Firebase Auth account:
> - `accessLevel: "super_admin"`
> - `isMasterTenant: true`
> - `orgId: "ogeemo-master"`
>
> Both `accessLevel === 'super_admin'` AND `isMasterTenant === true` are required to access the Owner Console. If either is missing, you'll see "Restricted Area."

---

## Part 2: The Owner Console (`/owner`)

The Owner Console is the dashboard for managing the Ogeemo platform. It shows:

- **Total Subscribers** — Number of active companies
- **Active Tenants** — Currently active subscriber companies
- **Suspended Tenants** — Companies that have been suspended
- **Total Users** — All users across all subscriber tenants
- **Total Admins** — Super admins + org admins across all tenants
- **Recent Subscribers** — The latest companies to join
- **All Subscribers Table** — Complete list with suspend/activate controls

### Suspending a Tenant

1. Go to `/owner`
2. Find the tenant in the "All Subscribers" table
3. Click **Suspend** — the tenant's users will lose access (enforced by Firestore rules)
4. Click **Activate** to restore access

> **Note:** The master tenant (`ogeemo-master`) cannot be suspended.

---

## Part 3: Creating a New Tenant (`/tenant-manager`)

This is how you provision a new subscriber company.

### Steps

1. Go to `/tenant-manager` (or click **New Tenant** from the Owner Console)
2. Fill in the form:
   - **Company Name** (required) — e.g., "Acme Inc."
   - **Admin Email** (required) — The email for the tenant's founding super admin
   - **Admin Name** (optional) — Display name for the admin
   - **Admin Password** (optional) — Leave blank to send a password reset link
3. Click **Create Tenant**

### What Happens Behind the Scenes

The system atomically creates:
1. A **Firebase Auth user** for the tenant admin
2. An **Organization document** in Firestore (with `isMasterTenant: false`)
3. A **User Profile document** in Firestore (with `accessLevel: super_admin`)
4. **Custom claims** on the auth user: `orgId`, `accessLevel: super_admin`, `isMasterTenant: false`

If no password was provided, a **password reset link** is generated and logged to the server console. The tenant admin uses this link to set their password and log in.

### After Creating a Tenant

The new tenant admin should:
1. Check their email for a password reset link (or use the password you set)
2. Set their password
3. Log in at `localhost:9002`
4. They'll be taken to the welcome dashboard
5. They can start using Ogeemo's features (accounting, CRM, projects, etc.)

---

## Part 4: Role Hierarchy

Within any tenant (including the master tenant), users have one of four access levels:

| Role | Weight | Label | Can Manage |
|------|--------|-------|------------|
| `super_admin` | 4 | Super Admin (Tenant Owner) | All roles |
| `org_admin` | 3 | Admin (Full Access) | Editor, Viewer |
| `editor` | 2 | Editor (Operational) | Viewer |
| `viewer` | 1 | Viewer (Read-Only) | None |

### Key Rules
- **Super Admin** is the top authority within a tenant. They can invite, update, or remove any user.
- **Org Admin** can manage editors and viewers but not other org admins or super admins.
- **Super Admin role is immutable** — once granted, it cannot be changed by anyone. This ensures every tenant always has at least one super admin.
- **You cannot change your own role** — another admin must do it.
- **Cross-tenant access is blocked** — users can only manage users within their own organization.

---

## Part 5: Managing Users Within a Tenant (`/user-manager`)

Once a tenant is created, the tenant's super admin (or org admin) can manage their own users.

### Accessing User Manager
- Go to `/user-manager`
- Only `org_admin` and `super_admin` roles can access this page

### Inviting a New User
1. Go to `/user-manager`
2. Enter the invitee's email and select their role
3. The system creates a Firebase Auth user (without a password)
4. A password reset link is generated and sent to the invitee
5. The invitee sets their password and logs in

### Changing a User's Role
1. Find the user in the list
2. Select a new role from the dropdown
3. The system updates both the Firestore profile and custom claims
4. The user must log out and log back in for the new role to take effect

### Removing a User
1. Find the user in the list
2. Click remove/delete
3. The user's profile and linked contact are deleted
4. The user can no longer log in

---

## Part 6: Using Ogeemo as a Tenant

Once a tenant is set up, the tenant admin and their users can:

1. **Log in** at `localhost:9002`
2. They'll see the **welcome dashboard**
3. Use the **main menu** to access modules:
   - **Accounting** — Ledgers, invoices, quotes, payroll, work orders, tax
   - **CRM** — Leads, action plans
   - **Projects** — Project management
   - **Calendar** — Scheduling
   - **Contacts** — Contact hub
   - **Documents** — File management
   - **Reports** — Various business reports
   - **User Manager** — Manage their tenant's users (admins only)

### Important: Data Isolation
- Each tenant's data is completely isolated
- Master tenant super admins **cannot** access subscriber tenant data
- Users can only see data belonging to their own organization

---

## Quick Reference

| Task | URL | Who Can Do It |
|------|-----|---------------|
| View Owner Console | `/owner` | Master tenant super admins |
| Create new tenant | `/tenant-manager` | Master tenant super admins |
| Suspend/activate tenant | `/owner` | Master tenant super admins |
| Manage tenant users | `/user-manager` | Tenant org_admin + super_admin |
| Use Ogeemo features | `/welcome` | Any authenticated user |

---

## Troubleshooting

### "Restricted Area" on `/owner`
This means your custom claims are not set correctly. Run:
```bash
npx tsx scripts/check-user-claims.ts your-email@example.com
```
If `isMasterTenant` is not `true` or `accessLevel` is not `super_admin`, run:
```bash
npx tsx scripts/promote-to-super-admin.ts your-email@example.com
```
Then log out and log back in.

### New tenant admin can't log in
- If you didn't set a password during tenant creation, check the server console for the password reset link
- The link is logged as `[TENANT ADMIN INVITE LINK] -> email: <link>`

### User role changes not taking effect
- The user must **log out and log back in** for new custom claims to take effect
- The auth context forces a token refresh, but a full re-login is most reliable