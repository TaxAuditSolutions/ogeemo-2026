(error ID: d0a693a9):
Overriding Next Config to add configs optmized for Firebase App Hosting
Successfully created next.config.js with Firebase App Hosting overrides

> nextn@0.1.1 build
> NEXT_DIST_DIR=.next-build npx -y node@22 ./node_modules/next/dist/bin/next build

   ▲ Next.js 15.2.8

   Creating an optimized production build ...
   Using tsconfig file: tsconfig.build.json
   Using tsconfig file: tsconfig.build.json
   Using tsconfig file: tsconfig.build.json
 ✓ Compiled successfully
   Skipping validation of types
   Skipping linting
   
Your tsconfig.json extends another configuration, which means we cannot add the Next.js TypeScript plugin automatically. To improve your development experience, we recommend adding the Next.js plugin (`"plugins": [{ "name": "next" }]`) manually to your TypeScript configuration. Learn more: https://nextjs.org/docs/app/api-reference/config/typescript#the-typescript-plugin

   Collecting page data ...
[AI Diagnostic] GEMINI_API_KEY is not defined in the environment. AI plugins are disabled.
   Generating static pages (0/174) ...
[AI Diagnostic] GEMINI_API_KEY is not defined in the environment. AI plugins are disabled.
   Generating static pages (43/174) 
   Generating static pages (86/174) 
   Generating static pages (130/174) 
 ✓ Generating static pages (174/174)
   Finalizing page optimization ...
   Collecting build traces ...
 ⚠ Failed to copy traced files for /workspace/.next-build/server/app/(app)/page.js [Error: ENOENT: no such file or directory, copyfile '/workspace/.next-build/server/app/(app)/page_client-reference-manifest.js' -> '/workspace/.next-build/standalone/.next-build/server/app/(app)/page_client-reference-manifest.js'] {
  errno: -2,
  code: 'ENOENT',
  syscall: 'copyfile',
  path: '/workspace/.next-build/server/app/(app)/page_client-reference-manifest.js',
  dest: '/workspace/.next-build/standalone/.next-build/server/app/(app)/page_client-reference-manifest.js'
}

Route (app)                                        Size  First Load JS
┌ ○ /                                             311 B         320 kB
├ ○ /_not-found                                   990 B         104 kB
├ ○ /a-z-sort                                   9.03 kB         290 kB
├ ○ /about                                        311 B         320 kB
├ ○ /accounting                                 8.75 kB         328 kB
├ ○ /accounting/accounts-payable                2.16 kB         105 kB
├ ○ /accounting/accounts-receivable             2.15 kB         105 kB
├ ○ /accounting/accrual-accounting              9.25 kB         306 kB
├ ○ /accounting/asset-management                2.13 kB         105 kB
├ ○ /accounting/audit-readiness                 5.61 kB         323 kB
├ ○ /accounting/bank-statements                 18.5 kB         351 kB
├ ○ /accounting/bks                             7.77 kB         305 kB
├ ○ /accounting/bks-info                          202 B         103 kB
├ ○ /accounting/bks-instructions                12.1 kB         311 kB
├ ○ /accounting/cash-accounting                 1.14 kB         104 kB
├ ○ /accounting/equity                          15.4 kB         341 kB
├ ○ /accounting/financial-snapshot              2.12 kB         105 kB
├ ○ /accounting/invoices/create                 2.18 kB         105 kB
├ ○ /accounting/invoices/instructions             12 kB         311 kB
├ ○ /accounting/invoices/preview                6.02 kB         130 kB
├ ○ /accounting/invoices/receipt                7.78 kB         132 kB
├ ○ /accounting/invoices/templates              9.22 kB         306 kB
├ ○ /accounting/invoices/view                   13.5 kB         300 kB
├ ○ /accounting/invoicing-report                9.63 kB         364 kB
├ ○ /accounting/ledgers                         2.17 kB         105 kB
├ ○ /accounting/loan-application                2.08 kB         105 kB
├ ○ /accounting/loan-manager                    2.12 kB         105 kB
├ ○ /accounting/manage-navigation               3.25 kB         381 kB
├ ○ /accounting/manage-navigation/instructions  2.68 kB         125 kB
├ ○ /accounting/onboarding                       2.1 kB         105 kB
├ ○ /accounting/payroll/calendar-test             353 B         103 kB
├ ○ /accounting/payroll/history                 11.8 kB         334 kB
├ ○ /accounting/payroll/history/stub            8.13 kB         125 kB
├ ○ /accounting/payroll/manage-workers          1.14 kB         104 kB
├ ○ /accounting/payroll/run                     2.11 kB         105 kB
├ ○ /accounting/payroll/settings                11.6 kB         328 kB
├ ○ /accounting/petty-cash                      2.11 kB         105 kB
├ ○ /accounting/quotes                          2.13 kB         105 kB
├ ○ /accounting/quotes/create                   2.17 kB         105 kB
├ ○ /accounting/quotes/instructions               180 B         106 kB
├ ○ /accounting/quotes/templates                9.21 kB         306 kB
├ ○ /accounting/receipt-processor                2.1 kB         105 kB
├ ○ /accounting/receipt-processor/instructions  9.57 kB         307 kB
├ ○ /accounting/reports/accrual-adjustments     2.09 kB         105 kB
├ ○ /accounting/reports/bank-reconciliation     11.3 kB         296 kB
├ ○ /accounting/reports/income-statement        8.94 kB         306 kB
├ ○ /accounting/service-items                   2.11 kB         105 kB
├ ○ /accounting/tax                             9.41 kB         307 kB
├ ○ /accounting/tax/categories                  16.1 kB         346 kB
├ ○ /accounting/tax/payroll-remittances         16.9 kB         343 kB
├ ○ /accounting/tax/sales-tax                   15.5 kB         329 kB
├ ○ /accounting/work-orders                     11.4 kB         334 kB
├ ƒ /accounting/work-orders/[id]                16.5 kB         351 kB
├ ○ /action-chips-info                          9.18 kB         315 kB
├ ○ /action-manager                             7.14 kB         330 kB
├ ○ /action-manager/manage                      5.79 kB         367 kB
├ ○ /action-manager/manage/instructions          2.7 kB         125 kB
├ ○ /action-manager/trash                       6.63 kB         329 kB
├ ○ /ai-dispatch                                  354 B         103 kB
├ ƒ /api/auth/session                             202 B         103 kB
├ ƒ /api/genkit/chat                              202 B         103 kB
├ ƒ /api/genkit/generate-image                    202 B         103 kB
├ ƒ /api/ogeemo-assistant                         202 B         103 kB
├ ƒ /api/ogeemo-chat-title                        202 B         103 kB
├ ƒ /api/upload-image                             202 B         103 kB
├ ƒ /api/upload-site-image                        202 B         103 kB
├ ○ /auth-test                                    782 B         254 kB
├ ○ /backup                                     8.96 kB         273 kB
├ ○ /blog/moderation                            9.05 kB         296 kB
├ ○ /calendar                                   2.13 kB         105 kB
├ ○ /calendar/instructions                      9.02 kB         127 kB
├ ○ /calendar/reminders                         11.1 kB         350 kB
├ ○ /change-password                            9.04 kB         303 kB
├ ○ /client-manager                               202 B         103 kB
├ ○ /co-pilot                                   14.6 kB         444 kB
├ ○ /command-centre                               202 B         103 kB
├ ○ /contact                                    9.24 kB         286 kB
├ ○ /contacts                                   15.8 kB         129 kB
├ ○ /crm                                          202 B         103 kB
├ ○ /crm/action-plan                            2.06 kB         105 kB
├ ○ /crm/leads/create                           2.06 kB         105 kB
├ ○ /crm/plan                                   11.9 kB         318 kB
├ ○ /document-manager                             191 B         361 kB
├ ○ /document-manager/instructions              8.87 kB         127 kB
├ ○ /email-hub                                  9.21 kB         133 kB
├ ○ /email-hub/log-email                        19.1 kB         373 kB
├ ○ /empowerment                                15.6 kB         321 kB
├ ○ /empowerment/tas-manifesto                  8.21 kB         285 kB
├ ○ /explore                                      202 B         103 kB
├ ○ /features                                   10.5 kB         315 kB
├ ○ /feedback                                    9.2 kB         330 kB
├ ○ /field-app                                  11.3 kB         291 kB
├ ○ /files/manage                                 404 B         103 kB
├ ○ /for-accountants                            6.38 kB         311 kB
├ ○ /for-bookkeepers                            6.37 kB         311 kB
├ ○ /for-consultants                            7.25 kB         311 kB
├ ○ /for-lawyers                                7.25 kB         311 kB
├ ○ /for-paralegals                             7.19 kB         311 kB
├ ○ /for-small-businesses                       7.41 kB         312 kB
├ ○ /for-virtual-assistants                     7.87 kB         312 kB
├ ○ /google                                     2.07 kB         105 kB
├ ○ /home                                         202 B         103 kB
├ ○ /hr-manager                                 8.78 kB         328 kB
├ ○ /hr-manager/manage-navigation               2.92 kB         367 kB
├ ○ /hr-manager/manage-workers-list             1.14 kB         104 kB
├ ○ /hr-manager/time-off                        16.1 kB         354 kB
├ ○ /hytexercise                                14.2 kB         344 kB
├ ○ /idea-board                                 2.77 kB         364 kB
├ ○ /idea-board/organize                        6.66 kB         372 kB
├ ○ /image-manager                                580 B         311 kB
├ ○ /inventory-manager                          3.42 kB         125 kB
├ ○ /inventory-manager/pos                      13.9 kB         347 kB
├ ○ /inventory-manager/track                    16.2 kB         371 kB
├ ○ /lead-to-ledger                             10.5 kB         315 kB
├ ○ /learn                                        11 kB         284 kB
├ ○ /legal-hub                                    191 B         361 kB
├ ○ /login                                      12.9 kB         324 kB
├ ○ /logout                                     3.81 kB         262 kB
├ ○ /marketing-manager                          7.67 kB         123 kB
├ ○ /master-mind                                2.15 kB         105 kB
├ ○ /master-mind/gtd-instructions               9.04 kB         127 kB
├ ○ /master-mind/instructions                   7.86 kB         126 kB
├ ○ /meetings                                   14.3 kB         314 kB
├ ○ /meetings/instructions                        180 B         106 kB
├ ○ /news                                         202 B         103 kB
├ ○ /ogeemail/compose                             226 B         103 kB
├ ○ /ogeemo-summary                               202 B         103 kB
├ ○ /owner                                       6.5 kB         324 kB
├ ○ /partners                                   9.43 kB         286 kB
├ ○ /philosophy/record-keeping                  5.81 kB         120 kB
├ ○ /pricing                                    7.21 kB         317 kB
├ ○ /privacy                                    10.6 kB         287 kB
├ ○ /project-plan                               7.72 kB         284 kB
├ ○ /project-status                             1.88 kB         113 kB
├ ○ /projects                                     202 B         103 kB
├ ƒ /projects/[projectId]                         202 B         103 kB
├ ƒ /projects/[projectId]/edit                  13.6 kB         374 kB
├ ƒ /projects/[projectId]/tasks                  4.3 kB         118 kB
├ ○ /projects/all                               2.16 kB         105 kB
├ ○ /projects/create                            14.1 kB         385 kB
├ ○ /projects/inbox/tasks                       17.7 kB         372 kB
├ ○ /projects/instructions                      7.43 kB         125 kB
├ ○ /register                                   10.2 kB         304 kB
├ ○ /reports                                    5.53 kB         119 kB
├ ○ /reports/bank-reconciliation                11.3 kB         296 kB
├ ○ /reports/client-statement                   14.6 kB         327 kB
├ ○ /reports/client-time-log                    13.4 kB         343 kB
├ ○ /reports/feedback                           10.1 kB         291 kB
├ ○ /reports/search                             6.84 kB         293 kB
├ ○ /reports/time-log                           19.4 kB         402 kB
├ ○ /reports/work-activity                      2.16 kB         105 kB
├ ○ /reset-password                             8.95 kB         303 kB
├ ○ /sandbox-agent                              5.32 kB         264 kB
├ ○ /sarah                                      8.04 kB         312 kB
├ ○ /settings                                   16.8 kB         332 kB
├ ○ /settings/rituals                           15.1 kB         333 kB
├ ○ /settings/rituals/instructions              7.35 kB         125 kB
├ ○ /settings/site-images                         471 B         311 kB
├ ○ /solutions                                  7.73 kB         284 kB
├ ○ /support/mentor-mediation                   12.6 kB         307 kB
├ ○ /tenant-manager                             4.95 kB         315 kB
├ ○ /tenant-manager/instructions                4.87 kB         119 kB
├ ○ /terms                                      11.8 kB         288 kB
├ ○ /test                                         202 B         103 kB
├ ○ /testing                                    1.04 kB         112 kB
├ ○ /to-do                                      2.12 kB         105 kB
├ ○ /tools/image-generator                      9.52 kB         279 kB
├ ○ /user-list                                  1.15 kB         104 kB
├ ○ /user-list/instructions                     6.75 kB         125 kB
├ ○ /user-manager                               13.3 kB         380 kB
├ ○ /user-manager/instructions                  8.47 kB         126 kB
├ ○ /user-notes                                  7.7 kB         325 kB
├ ƒ /user-notes/[id]                            3.81 kB         316 kB
├ ○ /website                                      202 B         103 kB
├ ○ /website-2                                    202 B         103 kB
└ ○ /welcome                                    6.78 kB         311 kB
+ First Load JS shared by all                    103 kB
  ├ chunks/1684-94f53716fc0921bb.js             45.3 kB
  ├ chunks/4bd1b696-809867b6b4783b15.js         53.3 kB
  └ other shared chunks (total)                 4.15 kB


ƒ Middleware                                    31.4 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

Restoring original next config in project root
node:fs:440
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open '/workspace/.next/standalone/.next/routes-manifest.json'
    at readFileSync (node:fs:440:20)
    at loadRouteManifest (file:///layers/google.nodejs.firebasenextjs/npm_modules/node_modules/@apphosting/adapter-nextjs/dist/utils.js:46:18)
    at addRouteOverrides (file:///layers/google.nodejs.firebasenextjs/npm_modules/node_modules/@apphosting/adapter-nextjs/dist/overrides.js:145:27)
    at file:///layers/google.nodejs.firebasenextjs/npm_modules/node_modules/@apphosting/adapter-nextjs/dist/bin/build.js:38:11
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5) {
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: '/workspace/.next/standalone/.next/routes-manifest.json'
}

Node.js v22.23.2