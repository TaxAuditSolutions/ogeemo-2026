# Debugging the Backup Feature: A Report for Nick

Hi Nick,

We've been encountering a persistent and vague "internal" error when trying to run the backup Cloud Functions. This type of error usually points to a server-side crash in the Cloud Functions environment, often related to configuration, permissions, or resource availability, rather than a simple logic bug in the function code itself.

This report provides context on the problem, what has been tried, and a recommended plan of action for debugging.

---
## **Update:** Specific Command-Line Fixes

Thanks to further analysis from Workspace Gemini, we now have a precise, command-line-based plan of action. These commands are often faster and more reliable than navigating the Google Cloud Console UI.

**Please run these commands in your local terminal after authenticating with `gcloud auth login`.**

### 1. Identify the Exact Service Account

First, we need to know exactly which "identity" the function is using, as it might not be the default one.

```bash
gcloud functions describe triggerFirestoreBackup --region=[YOUR_REGION] --format="value(serviceConfig.serviceAccountEmail)"
```
*(Replace `[YOUR_REGION]` with the region your functions are deployed in, e.g., `us-central1`)*

This command will output the service account email (let's call it `SA_EMAIL`).

### 2. Grant Required Roles

Once you have the `SA_EMAIL`, ensure it has the necessary roles to export the database and write to the storage bucket.

**To Grant Firestore Export Permissions:**

```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:SA_EMAIL" \
    --role="roles/datastore.importExportAdmin"
```

**To Grant Storage Bucket Access:**

```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:SA_EMAIL" \
    --role="roles/storage.admin"
```
*(Replace `[PROJECT_ID]` with your actual Google Cloud Project ID and `SA_EMAIL` with the email from step 1).*

**Note:** The `datastore.importExportAdmin` role is the specific one required for Firestore backups.

### 3. Enable the "Hidden" Export API

This is a very common cause of "internal" errors. The managed export service must be explicitly enabled for the project.

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

This updated plan is much more direct and should help you resolve the "internal" error quickly.

---

## Original Debugging Plan (For Reference)

### 1. Check the Cloud Function Logs
This is the most critical step. The "internal" error seen on the client is hiding a more specific error on the server.

- Go to the **Google Cloud Console** for this Firebase project.
- Navigate to the **Cloud Functions** section.
- Find the `triggerFirestoreBackup` and `triggerAuthBackup` functions.
- View their logs and trigger a backup from the app to see the detailed error message that occurs during execution. This will likely tell you the exact cause (e.g., "Permission denied", "API not enabled", "Bucket not found").

### 2. Verify Service Account Permissions
The Cloud Function executes as a specific service account. It needs the correct IAM roles to perform its tasks.

- In the Google Cloud Console, go to **IAM & Admin > Service Accounts**.
- Identify the service account being used by the functions (it's often the default App Engine service account: `<project-id>@appspot.gserviceaccount.com`).
- Go to **IAM & Admin > IAM**.
- Find that service account in the principals list and ensure it has the following roles:
  - **`Cloud Datastore Import Export Admin`**: Required for Firestore database exports.
  - **`Firebase Authentication Admin`**: Required to list and export users.
  - **`Storage Admin`**: Required to create the backup bucket (if needed) and write files to it.

### 3. Inspect the Cloud Storage Bucket
- In the Google Cloud Console, go to **Cloud Storage > Buckets**.
- Check if a bucket named **`<project-id>-backups`** exists.
- If it does not exist, the `storage.buckets.create` permission from the previous step is crucial.
- If it *does* exist, check its permissions to ensure the function's service account has write access.

### 4. Review Key APIs
Ensure the necessary APIs are enabled for the project:
- **Cloud Firestore API**
- **Cloud Storage API**
- **Identity and Access Management (IAM) API**
- **Firebase Authentication API**

By following these steps, the root cause of the "internal" error should become clear.

Good luck, Nick!
