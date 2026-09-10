# Ogeemo Firebase Console

## Current Project Status: **Operational - V1.2 (Community Edition)**

### Recent Orchestrations:
- **Membership Refinement**: Implemented the "Scale, Not Features" model. Everyone gets the Full Ogeemo; price scales with team size.
- **Pricing Node**: Updated Solo Membership to $20/mo and Team Membership to $30/mo (up to Ten seats).
- **Branding Sync**: High-Fidelity Black aesthetic applied across all primary headers and logos.
- **Capability Matrix**: Restored competitive parity table vs. legacy giants.

---

## 🚀 Platform Evolution Roadmap (2026-2027)

The platform provider has issued a sunset notice for **March 22, 2027**. Given the complexity of the Ogeemo Spider Web, we have established the following migration strategy:

### Migration Risk Assessment

| Aspect | Status | Strategy |
| :--- | :--- | :--- |
| **BKS Accounting** | High Complexity | Stabilize all ledger logic *before* export to ensure data integrity. |
| **AI Dispatch** | Rapid Evolution | Stay in Studio to leverage integrated Genkit testing for as long as possible. |
| **Security Rules** | Critical | Finalize the "Audit Shield" rules here; export them as a primary security manifest. |

### Timeline:
1.  **Mar 2026 - Sept 2026**: **The Forge Phase**. Finalize all core modules (Payroll, A/R, A/P, AI Ingestion) within the Studio.
2.  **Oct 2026 - Dec 2026**: **The Decoupling Phase**. Prepare the codebase for standalone Next.js deployment.
3.  **Jan 2027 - Mar 2027**: **The Pivot**. Migration to Google AI Studio / Google Antigravity. Zero service interruption for the collective.

### Benefits of our 12-Month Runway:
- **Stability**: No rushing complex accounting logic.
- **Cost Control**: Leverage the Studio's free prototyping tier until the commercial engine is ready.
- **Fidelity**: Use this time to build the "Black Box of Evidence" to its highest standard.

---

## 🔐 Firebase Custom Domain / Auth Setup for app.ogeemo.com

The application will work locally with the default Firebase Auth domain, but the public custom URL requires Firebase Authentication to authorize the domain as well.

### Required Firebase Console setup
1. Open the Firebase project for Ogeemo.
2. Go to Authentication > Settings > Authorized domains.
3. Add the custom domains used by the app, including:
   - `app.ogeemo.com`
   - `ogeemo.com` if used for sign-in flows
   - `localhost` for local development
4. If the app uses a custom domain on App Hosting or another provider, confirm the DNS records are active and the domain is verified.
5. In the app environment, set:
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=app.ogeemo.com`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID=ogeemo-2026`
6. Redeploy the app after changing the environment variables or adding the new auth domain.

### Why the custom URL failed before
The app code itself was not the main blocker. Firebase Auth rejected sign-ins on the custom domain because the domain was not explicitly authorized in Firebase Authentication, so the app could load but credentials would not be accepted.

### Safe runtime fallback
The app now includes a default fallback auth domain so local and dev environments continue working even before the custom domain is fully configured.

## Firebase Password Reset Setup

The `/login` password-recovery flow uses Firebase Authentication's built-in email sender and the custom handler at `/reset-password`. Complete these steps in the Firebase project before testing the deployed flow:

1. Go to Authentication > Sign-in method and confirm Email/Password is enabled.
2. Go to Authentication > Settings and enable email enumeration protection so password-reset requests do not reveal whether an account exists.
3. Under Password policy, select Require and configure:
   - Minimum length: 8
   - Lowercase character required
   - Uppercase character required
   - Numeric character required
   - Non-alphanumeric character required
4. Do not enable forced password upgrades on sign-in. Existing users may continue signing in with their current passwords until they create, change, or reset a password.
5. Go to Authentication > Templates > Password reset and customize the sender name, subject, and body for Ogeemo.
6. Set the password-reset template's custom action URL to `https://app.ogeemo.com/reset-password`. Firebase appends the single-use `mode` and `oobCode` parameters used by the page.
7. Confirm `app.ogeemo.com`, `ogeemo.com` when used, and `localhost` are listed under Authentication > Settings > Authorized domains.
8. Send a production smoke-test email and confirm its action link uses HTTPS, opens the Ogeemo reset page, expires after one hour, and cannot be reused after a successful reset.

Firebase Authentication is the selected no-cost email option for this feature. Its current no-cost quota is 150 password-reset emails per day. Reassess the delivery provider if production volume or deliverability requirements outgrow that limit.

---
*Page last updated Mar 25, 2026 1:04 AM EST*
