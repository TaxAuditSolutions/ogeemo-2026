# Ogeemo Comprehensive Ingestion Flow Runbook

Use this runbook as the step-by-step sequence for Copilot to build and maintain a broad guide corpus in Firestore vectors.

## Step 1: Prepare environment
- Confirm .env.local includes GOOGLE_API_KEY.
- Confirm GOOGLE_APPLICATION_CREDENTIALS points to a valid service account key.
- Confirm local app is running if using browser automation workflows.

## Step 2: Pick high-priority workflow intents
- Open docs/guides/coverage-matrix.csv.
- Select rows with criticality = critical and status = missing.
- Start with reports/export, auth, contacts, files, accounting, payroll.

## Step 3: Generate guide documents
Run generation with metadata per workflow.

Example command:

TARGET_URL=http://localhost:9002/home \
GUIDE_MODULE=reports \
GUIDE_INTENT=export-reports \
GUIDE_TARGET_AUDIENCE=general \
GUIDE_VERSION=1.0.0 \
npx tsx scripts/generate-guide.ts

Expected result:
- A new JSON file appears in dev/guides.
- File follows guide contract fields from docs/guides/guide-contract.json.

## Step 4: Validate guide quality before ingestion
For each generated file, verify:
- At least 3 steps.
- Includes prerequisites, validations, commonErrors, recovery, and faq.
- Title, module, intent, and targetAudience are present.

If quality is weak, regenerate with tighter objective wording.

## Step 5: Ingest guides into Firestore vectors
Run:

npx tsx scripts/ingest-guides.ts

Expected result:
- Files are normalized and chunked (overview, prerequisites, steps, validations, troubleshooting, faq).
- Each chunk becomes a deterministic document in help_guides.
- Process prints ingestion summary counts.
- Source files are moved to dev/guides/archive.

## Step 6: Redeploy backend after retrieval logic changes
If functions/src/index.ts changed, run:

npm --prefix functions run build
npx firebase-tools deploy --only functions:ogeemoAssistant

## Step 7: Validate assistant responses
Run representative question tests:

curl -s -X POST "https://ogeemoassistant-qsckasljxq-uc.a.run.app" \
  -H "Content-Type: application/json" \
  -d '{"question":"How do I export reports?"}'

Success criteria:
- Response contains actionable procedure when matching guide chunks exist.
- If context is missing, response clearly states what is missing.

## Step 8: Check runtime errors
Run:

gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="ogeemoassistant" AND resource.labels.location="us-central1" AND severity>=ERROR' \
  --project ogeemo-firebase \
  --limit 20 \
  --format='value(timestamp,severity,textPayload,jsonPayload.message)'

If errors appear, patch and repeat Steps 5-8.

## Step 9: Update coverage matrix
After each successful workflow ingestion:
- Set status from missing -> draft -> verified.
- Fill sourceGuideId and owner.

## Step 10: Repeat in weekly ingestion cycles
- Continue generating workflows from uncovered critical questions first.
- Re-run ingestion and test set until essential-question pass rate is high.
