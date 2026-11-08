# Ogeemo Knowledge Base beta

A separate, read-only product-knowledge assistant at `/knowledge-base`. The operational Co-Pilot prompt, tools, and `/api/genkit/chat` API are unchanged.

## Architecture

1. **Repository source of truth:** `src/ai/knowledge-base/sources/*.json` contains small, reviewed instruction documents with stable IDs, routes, keywords, audiences, content, and source-code references.
2. **Publishing:** `npm run knowledge:sync` validates the documents and upserts them into `knowledgeBaseChunks`. It also writes `knowledgeBaseMetadata/current`. Only stale documents marked `managedBy: ogeemo-repo-sync` are deleted.
3. **Retrieval:** `src/ai/knowledge-base/retrieve.ts` performs bounded, single-field Firestore queries. `retriever.ts` ranks candidates by keywords, title, module, route, and current page. At most four excerpts reach the model.
4. **Answering:** `src/ai/flows/knowledge-base-chat.ts` supplies only those excerpts to Gemini. It has no operational tools and never accepts arbitrary database queries from the model.
5. **Citations:** `/api/knowledge-base/chat` returns the actual retrieved entries; the UI displays their titles and user-facing routes.

Firestore is accessed through Firebase Admin on the server. Browsers neither read nor write the knowledge collections directly.

## Development fallback

If Firebase Admin is unavailable, retrieval fails, or the collection has not yet been populated, the server selectively retrieves from the same repository source documents. It still does not put the whole knowledge set into the prompt. API responses identify the store as `firestore` or `source-fallback` for diagnostics.

## Commands

```sh
npm run knowledge:sync -- --dry-run  # validate without writing
npm run knowledge:sync               # publish to Firestore
npm test                             # source, retrieval, route, and application tests
npm run knowledge:compare            # paid Gemini calls; writes scratch/knowledge-base-comparison.md
```

The comparison runner strips Admin credentials so the existing Co-Pilot cannot write and the beta uses source fallback. Grade both answers for factual accuracy, complete steps, correct routes, appropriate uncertainty, and usefulness.

## Current coverage

- Activity Manager: Action/Project/Note, Subject/Notes, When choices, next-free-slot rules, save controls, time sessions and billing
- Calendar: quick entry, Add dialog, Done/Reopen, overdue rules, dragging
- Navigation: All/Groups/Favorites, filtering/sorting, Workflows
- Contacts and Clients: creation and required fields, system/default folders, folder management, editing/deletion, merging duplicates (linked records are moved first), workflow actions, Client Record, document-folder provisioning, and worker-only HR fields
- Projects: Project List, Project Board and Planner; creating from scratch or a template; statuses; register sorting; project actions; deletion (including that it removes linked tasks); the Task Board; planner steps and scheduling; and the Activity Manager project picker
- Workflows: what a standard workflow is, creating/editing/sorting, the nine role templates, sidebar fallback rules, deletion, and Welcome-page integration
- Time Tracking and Reports: the timer (start, pause, resume, log), how the running timer is remembered, editing sessions, scheduled versus worked time, the Worker and Client Time Log reports, logging time after the fact, billing eligibility and Time Log to Invoice, the Work Activity Summary, which report to use, how time feeds payroll, and how reports date entries with no set time
- Platform and beta limitations

It does not answer live account questions or perform actions. Unsupported questions should return an explicit not-documented response.

## Evaluation status

The initial pilot comparison covers 12 questions spanning all current modules, a live-data request, and an deliberately unsupported question. The final run completed with no runtime errors and no model-added citation links. The beta provided current instructions where the operational Co-Pilot still had stale or missing Activity Manager and sidebar information. This is a small pilot evaluation, not evidence of complete Ogeemo coverage.

The generated report is `scratch/knowledge-base-comparison.md`. Live Firestore retrieval was also verified separately, including next-free-slot and platform-identity questions. A live Gemini answer returned only backend-verified citations after reply sanitization.

## Adding a module

1. Inspect the current UI, hooks, services, and business rules.
2. Add focused JSON documents with unique stable IDs and accurate source references.
3. Run the source and retrieval tests; add golden questions for the new module.
4. Compare answers against the operational Co-Pilot and correct retrieval or content failures.
5. Publish with `npm run knowledge:sync` in the same release as the application changes.

Do not add one large document per module. Keep each answer focused so retrieval can select only the necessary instructions. Add embeddings only if measured lexical-retrieval failures justify the extra infrastructure.
