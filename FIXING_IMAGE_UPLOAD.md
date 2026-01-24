
# How to Fix Image Upload "Internal" Server Errors

This guide provides the precise, command-line steps to resolve the vague "internal" server errors that occur when uploading or managing site images. These errors are caused by missing cloud permissions for the function's service account, not by a bug in the application code itself.

The solution is to grant the correct IAM role to the service account that runs your Cloud Functions.

---

### Step 1: Find Your Function's Service Account

First, we need to find the email address of the service account your `uploadSiteImage` function is using.

Run the following command in your terminal (make sure you are logged into gcloud):

```bash
gcloud functions describe uploadSiteImage --region=[YOUR_REGION] --format="value(serviceConfig.serviceAccountEmail)"
```
*(Replace `[YOUR_REGION]` with the region your functions are deployed in, e.g., `us-central1`)*

This command will output the service account email. Copy this email for the next step.

### Step 2: Grant the Required Role

Now, run the following command, replacing `[PROJECT_ID]` with your Google Cloud Project ID and `[SA_EMAIL]` with the email address you copied in step 1.

**Grant Storage Admin Role**
This role allows the function to read, write, and delete files in your project's Cloud Storage bucket, and to make them public.

```bash
gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:[SA_EMAIL]" \
    --role="roles/storage.admin"
```

### Step 3: Try Again

After running the command successfully, please return to the Ogeemo app and try uploading or replacing an image again. The "internal" error should now be resolved, and the operation will succeed.

This is the definitive fix for the permission issue we have been facing.
