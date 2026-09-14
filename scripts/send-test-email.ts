/**
 * Live end-to-end test for the Ogeemo email notification service.
 *
 * Usage:  npx tsx scripts/send-test-email.ts
 *
 * Requires SMTP_USER/SMTP_PASS to be set in .env.local. Sends one test email
 * to the configured recipients (notifications@ogeemo.com + dan@ogeemo.com)
 * exactly as the real form notifications will be sent.
 */
import dotenv from 'dotenv';

// Load the same env file the Next.js dev server uses.
dotenv.config({ path: '.env.local' });

async function main() {
  const { isEmailServiceConfigured, sendFormNotification } = await import('../src/core/email-service');

  if (!isEmailServiceConfigured()) {
    console.error(
      '[Test] SMTP credentials are not configured.\n' +
        '       Set SMTP_USER and SMTP_PASS in .env.local (see the "Ogeemo Form Notification Email" block).'
    );
    process.exit(1);
  }

  console.info('[Test] Sending test notification via SMTP...');
  const result = await sendFormNotification({
    formName: 'Test Notification',
    heading: 'Ogeemo Email Service — Live Test',
    fields: [
      { label: 'Status', value: 'This is a test of the Ogeemo form notification pipeline.' },
      { label: 'Trigger', value: 'scripts/send-test-email.ts' },
      { label: 'Expected Recipients', value: 'notifications@ogeemo.com, dan@ogeemo.com' },
    ],
    replyTo: 'notifications@ogeemo.com',
  });

  if (result.sent) {
    console.info('[Test] SUCCESS — check the inboxes of notifications@ogeemo.com and dan@ogeemo.com.');
  } else {
    console.error(`[Test] FAILED — ${result.error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[Test] Unexpected error:', error);
  process.exit(1);
});