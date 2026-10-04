/** @type {import('next').NextConfig} */
const { PHASE_PRODUCTION_BUILD } = require("next/constants");

const createNextConfig = (phase) => ({
  distDir: process.env.NEXT_DIST_DIR || ".next",
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: phase === PHASE_PRODUCTION_BUILD ? "tsconfig.build.json" : "tsconfig.json",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      // The Events Manager used to live at /master-mind. Keep old bookmarks
      // and deep links (query strings such as ?eventId= are preserved)
      // working.
      { source: '/master-mind', destination: '/event-manager', permanent: false },
      { source: '/master-mind/:path*', destination: '/event-manager/:path*', permanent: false },

      // The tool guides moved under Learn Ogeemo (docs/help-standard.md):
      // all teaching lives in one library, old URLs keep working.
      { source: '/accounting/bks-instructions', destination: '/learn/guides/bookkeeping', permanent: false },
      { source: '/accounting/invoices/instructions', destination: '/learn/guides/invoices', permanent: false },
      { source: '/accounting/manage-navigation/instructions', destination: '/learn/guides/accounting-navigation', permanent: false },
      { source: '/accounting/quotes/instructions', destination: '/learn/guides/quotes', permanent: false },
      { source: '/accounting/receipt-processor/instructions', destination: '/learn/guides/receipt-intake', permanent: false },
      { source: '/action-manager/manage/instructions', destination: '/learn/guides/customize-shortcuts', permanent: false },
      { source: '/calendar/instructions', destination: '/learn/guides/calendar', permanent: false },
      { source: '/document-manager/instructions', destination: '/learn/guides/document-manager', permanent: false },
      { source: '/event-manager/gtd-instructions', destination: '/learn/guides/gtd', permanent: false },
      { source: '/event-manager/instructions', destination: '/learn/guides/activity-manager', permanent: false },
      { source: '/meetings/instructions', destination: '/learn/guides/meetings', permanent: false },
      { source: '/projects/instructions', destination: '/learn/guides/projects', permanent: false },
      { source: '/settings/rituals/instructions', destination: '/learn/guides/rituals', permanent: false },
      { source: '/tenant-manager/instructions', destination: '/learn/guides/tenant-manager', permanent: false },
      { source: '/user-list/instructions', destination: '/learn/guides/user-list', permanent: false },
      { source: '/user-manager/instructions', destination: '/learn/guides/user-manager', permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  serverExternalPackages: [
    'firebase-admin',
    'genkit',
    '@genkit-ai/core',
    '@genkit-ai/googleai',
    '@opentelemetry/sdk-node',
  ],
});

module.exports = createNextConfig;
