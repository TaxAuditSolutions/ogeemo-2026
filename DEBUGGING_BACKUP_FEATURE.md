
# How to Fix "Internal" Server Errors

This guide provides precise, command-line steps to resolve the vague "internal" errors that can occur when using server-side features like backups or image uploads. These errors are almost always caused by missing cloud permissions for the function's service account, not by a bug in the application code itself.

This document covers issues that present as an "internal" error:
1.  **Image Upload/Replace Failure**
2.  **Backup Feature Failure**
3.  **Password Update Failure**

The solution for all of these is to grant the correct roles to the service account that runs the functions. Please follow the steps below carefully.

---
## **Update:** Specific Command-Line Fixes

Thanks to further analysis, we now have a precise, command-line-based plan of action. These commands are often faster and more reliable than navigating the Google Cloud Console UI.

**Please run these commands in your local terminal after authenticating with `gcloud auth login`.**

### 1. Identify the Exact Service Account

First, we need to know exactly which "identity" your functions are using. This command will work for any of the functions (`triggerFirestoreBackup`, `uploadSiteImage`, `updateUserAuth`).

```bash
gcloud functions describe uploadSiteImage --region=[YOUR_REGION] --format="value(serviceConfig.serviceAccountEmail)"
```
*(Replace `[YOUR_REGION]` with the region your functions are deployed in, e.g., `us-central1`)*

This command will output the service account email (let's call it `SA_EMAIL`). Copy it for the next step.

### 2. Grant Required Roles

Once you have the `SA_EMAIL`, ensure it has the necessary roles to perform all backend tasks. **Run all of the following commands** to ensure comprehensive permissions. Replace `[PROJECT_ID]` with your actual Google Cloud Project ID and `SA_EMAIL` with the email from step 1.

**For the Password Update Feature (`updateUserAuth`):**
```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:SA_EMAIL" \
    --role="roles/firebaseauth.admin"
```

**For the Firestore Backup Feature (`triggerFirestoreBackup`):**
```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:SA_EMAIL" \
    --role="roles/datastore.importExportAdmin"
```

**For All Storage Operations (Image Uploads & Auth Backups):**
```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:SA_EMAIL" \
    --role="roles/storage.admin"
```

**For Creating Public Image URLs (`uploadSiteImage`, `replaceSiteImage`):**
This is a critical, often-missed permission required for generating the public download links for images.
```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:SA_EMAIL" \
    --role="roles/iam.serviceAccountTokenCreator"
```

### 3. Enable the "Hidden" Export API (For Backups Only)

This is a very common cause of "internal" errors for the backup feature. The managed export service must be explicitly enabled for the project.

```bash
gcloud services enable datastore.googleapis.com
```

### 4. Verify the Backup Bucket (Optional but Recommended)

You can quickly check if the bucket exists and verify its permissions.

```bash
# Check if bucket exists
gsutil ls -b gs://[PROJECT_ID]-backups

# Check the IAM policy specifically on that bucket
gsutil iam get gs://[PROJECT_ID]-backups
```

This updated plan is much more direct and should help you resolve these "internal" errors quickly and permanently.

---
## Original UI-Based Debugging Plan (For Reference)

- **Check Cloud Function Logs:** Go to the Google Cloud Console for your project, navigate to Cloud Functions, find the relevant function, and view its logs for a specific error message.
- **Verify IAM Roles:** In the IAM & Admin section, ensure the service account used by your functions has the roles listed above.
- **Inspect Storage Buckets:** Ensure the buckets your functions need to write to (e.g., `<project-id>-backups`) exist and that the service account has write permissions on them.
- **Enable Key APIs:** Make sure Cloud Firestore API, Cloud Storage API, and IAM API are enabled.
