# Ogeemo User Manager

## Overview
The User Manager is a securely restricted administrative dashboard within the Ogeemo platform. It allows administrators to securely manage the accounts and permissions for their team. 

Access to the User Manager (located at `/user-manager`) is strictly governed by role-based access control. A user must have the `admin` role assigned to their profile to access this area; otherwise, they will be blocked and redirected to the dashboard.

## Capabilities
From the User Manager dashboard, an administrator can perform the following actions:

1. **View Authenticated Users**: Review a structured list of all team members and their associated profiles. This list displays their User ID (or Employee Number), Name, Email, current Role, and Creation Date.
2. **Add Users**: Provision new user profiles for team members joining the workspace.
3. **Edit Profiles**: Update existing user details such as names, roles, and employee numbers via the 3-dot action menu.
4. **Change Passwords**: Securely reset or change the password for any given user directy from their profile record.
5. **Delete Profiles**: Remove a user's operational profile record from the platform. *(Note: Deleting a profile removes their specific access node within Ogeemo, though it does not delete their underlying core authenticated login account).*
