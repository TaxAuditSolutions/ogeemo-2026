import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Ogeemo Email Service (server-only)
 *
 * Sends form-submission notifications to the Ogeemo team mailboxes through
 * Google Workspace SMTP (ogeemo.com MX is Google):
 *   - notifications@ogeemo.com  (archive copy)
 *   - dan@ogeemo.com            (human recipient)
 *
 * Server criteria (SSL/TLS, requires authentication):
 *   Outgoing Server: smtp.gmail.com — SMTP Port 465 (implicit SSL)
 *   Username: the Workspace mailbox; Password: a 16-character Google App Password
 *   (2-Step Verification required; the normal account password is rejected)
 *
 * Configuration comes from environment variables so the same code works in
 * local development (.env.local) and production (App Hosting / Secret Manager):
 *
 *   SMTP_HOST                 - SMTP server (default: smtp.gmail.com)
 *   SMTP_PORT                 - SMTP port (default: 465)
 *   SMTP_USER                 - Workspace mailbox that SENDS the alert
 *   SMTP_PASS                 - that mailbox's Google App Password
 *   OGEEMO_NOTIFICATIONS_EMAIL- From: address (default: SMTP_USER, then notifications@ogeemo.com)
 *   OGEEMO_NOTIFY_RECIPIENTS  - comma-separated recipients
 *                               (default: notifications@ogeemo.com,dan@ogeemo.com)
 *
 * This module never throws: callers get a { sent, error } result so a mail
 * outage can never break a form submission.
 */

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || '465');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

// Gmail rewrites or rejects a From address that is not the authenticated user or one of its aliases.
export function resolveSenderEmail(opts: { override?: string; smtpUser?: string }): string {
  return opts.override || opts.smtpUser || 'notifications@ogeemo.com';
}

export const NOTIFICATIONS_EMAIL = resolveSenderEmail({
  override: process.env.OGEEMO_NOTIFICATIONS_EMAIL,
  smtpUser: SMTP_USER,
});

export const NOTIFY_RECIPIENTS = (
  process.env.OGEEMO_NOTIFY_RECIPIENTS || 'notifications@ogeemo.com,dan@ogeemo.com'
)
  .split(',')
  .map((addr) => addr.trim())
  .filter(Boolean);

export interface FormNotificationField {
  label: string;
  value: string;
}

export interface FormNotificationPayload {
  /** Human-readable form name, e.g. "Contact Form". */
  formName: string;
  /** Email subject line heading, e.g. "New Connection Signal — John Smith". */
  heading?: string;
  /** Ordered list of fields to render in the email body. */
  fields: FormNotificationField[];
  /** Submitter's email, set as Reply-To so the team can answer in one click. */
  replyTo?: string;
  /** ISO timestamp of the submission (defaults to now). */
  submittedAt?: string;
  /** Overrides the default team recipients (NOTIFY_RECIPIENTS). */
  recipients?: string[];
}

export interface EmailSendResult {
  sent: boolean;
  error?: string;
}

let transporter: Transporter | null = null;

export function isEmailServiceConfigured(): boolean {
  return Boolean(SMTP_USER && SMTP_PASS);
}

function getTransporter(): Transporter | null {
  if (!isEmailServiceConfigured()) {
    console.warn(
      '[Email Service] SMTP_USER/SMTP_PASS not set. Skipping email send (form data is still saved).'
    );
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildFormNotificationEmail(payload: FormNotificationPayload): {
  subject: string;
  text: string;
  html: string;
} {
  const heading = payload.heading || `New ${payload.formName} Submission`;
  const subject = `[Ogeemo] ${heading}`;
  const submittedAt = payload.submittedAt || new Date().toISOString();
  const fields = payload.fields.filter((field) => field.value && field.value.trim());

  const textLines = [
    heading,
    `Form: ${payload.formName}`,
    `Submitted: ${submittedAt}`,
    '',
    ...fields.map((field) => `${field.label}: ${field.value}`),
    '',
    '-- Sent automatically by the Ogeemo notification service --',
  ];

  const htmlRows = fields
    .map(
      (field) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-weight:bold;vertical-align:top;white-space:nowrap;">${escapeHtml(
          field.label
        )}</td><td style="padding:6px 0;color:#0f172a;white-space:pre-wrap;">${escapeHtml(
          field.value
        )}</td></tr>`
    )
    .join('');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;">
  <h2 style="color:#4f46e5;margin:0 0 4px 0;">${escapeHtml(heading)}</h2>
  <p style="color:#64748b;margin:0 0 16px 0;font-size:13px;">
    Form: ${escapeHtml(payload.formName)} &middot; Submitted: ${escapeHtml(submittedAt)}
  </p>
  <table style="border-collapse:collapse;font-size:14px;">${htmlRows}</table>
  <p style="color:#94a3b8;font-size:11px;margin-top:20px;">
    Sent automatically by the Ogeemo notification service.
  </p>
</div>`;

  return { subject, text: textLines.join('\n'), html };
}

export const REGISTRATION_NOTIFY_EMAIL = 'info@ogeemo.com';

export interface RegistrationNotificationInput {
  orgName: string;
  name?: string;
  email: string;
  orgId: string;
  uid: string;
}

/** Never include the password here; this payload is emailed in plain text. */
export function buildRegistrationNotification(
  input: RegistrationNotificationInput
): FormNotificationPayload {
  return {
    formName: 'Account Registration',
    heading: `New Organization Registration — ${input.orgName}`,
    fields: [
      { label: 'Organization Name', value: input.orgName },
      { label: 'Contact Name', value: input.name || '' },
      { label: 'Email', value: input.email },
      { label: 'Organization ID', value: input.orgId },
      { label: 'User ID', value: input.uid },
      { label: 'Access Level', value: 'super_admin' },
    ],
    replyTo: input.email,
    recipients: [REGISTRATION_NOTIFY_EMAIL],
  };
}

export function resolveRecipients(payload: Pick<FormNotificationPayload, 'recipients'>): string[] {
  const custom = (payload.recipients || []).map((addr) => addr.trim()).filter(Boolean);
  return custom.length > 0 ? custom : NOTIFY_RECIPIENTS;
}

export async function sendFormNotification(
  payload: FormNotificationPayload
): Promise<EmailSendResult> {
  try {
    const client = getTransporter();
    if (!client) {
      return { sent: false, error: 'email_not_configured' };
    }

    const { subject, text, html } = buildFormNotificationEmail(payload);
    const recipients = resolveRecipients(payload);

    await client.sendMail({
      from: `"Ogeemo Notifications" <${NOTIFICATIONS_EMAIL}>`,
      to: recipients.join(', '),
      ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      subject,
      text,
      html,
    });

    console.info(
      `[Email Service] Notification sent for "${payload.formName}" -> ${recipients.join(', ')}`
    );
    return { sent: true };
  } catch (error: any) {
    console.error('[Email Service] Failed to send notification:', error?.message || error);
    return { sent: false, error: error?.message || 'unknown_error' };
  }
}