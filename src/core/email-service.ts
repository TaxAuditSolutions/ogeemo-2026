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

// Public URL used for links inside outbound emails (e.g. the welcome email).
// Overridable per environment; production points at the live hosting site.
export const OGEEMO_APP_URL = (
  process.env.OGEEMO_APP_URL || 'https://ogeemo-firebase.web.app'
).replace(/\/+$/, '');

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

/**
 * A complete, ready-to-send email message.
 * `to` is the list of recipient addresses (the welcome email targets the
 * new tenant's Master Tenant directly).
 */
export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

/**
 * Welcome email sent to the person who signs up a new tenant (its Master
 * Tenant / super_admin) so joining the Ogeemo Community is acknowledged from
 * both sides: they get this note, info@ogeemo.com gets the registration
 * notice. Never include the password here; this payload is emailed in plain text.
 */
export function buildWelcomeToOgeemoEmail(input: {
  orgName: string;
  email: string;
  name?: string;
}): EmailMessage {
  const greeting = input.name?.trim() || input.orgName;
  const appUrl = escapeHtml(OGEEMO_APP_URL);
  const heading = `Welcome to the Ogeemo Community, ${greeting}!`;

  const textLines = [
    heading,
    '',
    `Your Ogeemo workspace for ${input.orgName} is ready.`,
    '',
    'Getting started:',
    `  1. Open your workspace: ${OGEEMO_APP_URL}/welcome`,
    `  2. Take the guided tour: ${OGEEMO_APP_URL}/learn`,
    '  3. Make it your own: Settings - profile, visual identity, and preferences',
    '',
    'Questions? Just reply to this email - we are happy to help.',
    '',
    '- The Ogeemo Team',
    '',
    'Sent automatically by Ogeemo.',
  ];

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;">
  <h2 style="color:#4f46e5;margin:0 0 12px 0;">${escapeHtml(heading)}</h2>
  <p style="color:#0f172a;font-size:14px;margin:0 0 16px 0;">
    Your Ogeemo workspace for <strong>${escapeHtml(input.orgName)}</strong> is ready.
  </p>
  <ol style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 20px 0;padding-left:20px;">
    <li>Open your workspace: <a href="${appUrl}/welcome" style="color:#4f46e5;">${appUrl}/welcome</a></li>
    <li>Take the guided tour: <a href="${appUrl}/learn" style="color:#4f46e5;">${appUrl}/learn</a></li>
    <li>Make it your own: Settings &rarr; profile, visual identity, and preferences</li>
  </ol>
  <p style="color:#0f172a;font-size:14px;margin:0 0 16px 0;">
    Questions? Just reply to this email &mdash; we're happy to help.
  </p>
  <p style="color:#0f172a;font-size:14px;margin:0;">&mdash; The Ogeemo Team</p>
  <p style="color:#94a3b8;font-size:11px;margin-top:20px;">Sent automatically by Ogeemo.</p>
</div>`;

  return {
    to: [input.email],
    subject: heading,
    text: textLines.join('\n'),
    html,
    replyTo: REGISTRATION_NOTIFY_EMAIL,
  };
}

export interface ReceiptEmailInput {
  /** Client recipient address (validated by the caller). */
  to: string;
  companyName: string;
  invoiceNumber: string;
  /** Payment receipt number (REC-...); legacy invoices may omit it. */
  receiptNumber?: string;
  /** Payment amount this receipt acknowledges. */
  amount: number;
  /** Invoice total, when known - enables the balance line. */
  originalAmount?: number;
  /** Cumulative amount received to date, when known. */
  amountPaid?: number;
  /** Payment date (ISO or yyyy-MM-dd); defaults to today. */
  paymentDate?: string;
}

const formatUsd = (value: number) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const formatReceiptDate = (iso?: string): string => {
  // Date-only values (yyyy-MM-dd) are parsed as LOCAL dates so a payment
  // dated Oct 24 never renders Oct 23 just because of the server timezone.
  const source = iso && iso.length === 10 ? `${iso}T00:00:00` : iso;
  const parsed = source ? new Date(source) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

/**
 * Client-facing payment receipt email (pure builder - unit tested).
 * Leads with the REC number so clients can quote it; legacy receipts fall
 * back to an invoice-only subject line.
 */
export function buildReceiptEmail(input: ReceiptEmailInput): EmailMessage {
  const subject = input.receiptNumber
    ? `Receipt ${input.receiptNumber} for Invoice ${input.invoiceNumber}`
    : `Receipt for Invoice ${input.invoiceNumber}`;
  const received = formatUsd(input.amount);
  const paidDate = formatReceiptDate(input.paymentDate);
  const balanceDue =
    typeof input.originalAmount === 'number' && typeof input.amountPaid === 'number'
      ? input.originalAmount - input.amountPaid
      : undefined;
  const paidInFull = balanceDue !== undefined && balanceDue <= 0.01;

  const textLines = [
    `Receipt for ${input.companyName}`,
    '',
    input.receiptNumber ? `Receipt #: ${input.receiptNumber}` : 'Receipt #: see invoice record',
    `Invoice #: ${input.invoiceNumber}`,
    `Amount received: ${received}`,
    `Date received: ${paidDate}`,
    ...(typeof input.originalAmount === 'number' ? [`Invoice total: ${formatUsd(input.originalAmount)}`] : []),
    ...(balanceDue !== undefined
      ? [paidInFull ? 'Balance due: Paid in full' : `Balance due: ${formatUsd(balanceDue)}`]
      : []),
    '',
    'View your invoices any time in Ogeemo:',
    `${OGEEMO_APP_URL}/accounting/accounts-receivable`,
    '',
    'Thank you for your business!',
    '- Sent automatically by Ogeemo',
  ];

  const moneyCell = (label: string, value: string, opts?: { green?: boolean }) => `
    <tr>
      <td style="padding:4px 16px 4px 0;color:#64748b;">${escapeHtml(label)}</td>
      <td style="padding:4px 0;${opts?.green ? 'color:#16a34a;font-weight:bold;' : ''}">${escapeHtml(value)}</td>
    </tr>`;

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;">
  <h2 style="color:#4f46e5;margin:0 0 4px 0;">Receipt${input.receiptNumber ? ` ${escapeHtml(input.receiptNumber)}` : ''}</h2>
  <p style="color:#94a3b8;font-size:12px;margin:0 0 16px 0;">For Invoice ${escapeHtml(input.invoiceNumber)} &middot; ${escapeHtml(input.companyName)}</p>
  <table style="border-collapse:collapse;font-size:14px;color:#0f172a;margin:0 0 16px 0;">
    ${moneyCell('Amount received', received)}
    ${moneyCell('Date received', paidDate)}
    ${typeof input.originalAmount === 'number' ? moneyCell('Invoice total', formatUsd(input.originalAmount)) : ''}
    ${balanceDue !== undefined ? moneyCell('Balance due', paidInFull ? 'Paid in full' : formatUsd(balanceDue), { green: paidInFull }) : ''}
  </table>
  <p style="color:#0f172a;font-size:14px;margin:0 0 16px 0;">Thank you for your business!</p>
  <p style="color:#94a3b8;font-size:11px;margin:0;">Sent automatically by Ogeemo.</p>
</div>`;

  return { to: [input.to], subject, text: textLines.join('\n'), html };
}

export function resolveRecipients(payload: Pick<FormNotificationPayload, 'recipients'>): string[] {
  const custom = (payload.recipients || []).map((addr) => addr.trim()).filter(Boolean);
  return custom.length > 0 ? custom : NOTIFY_RECIPIENTS;
}

export async function sendEmailMessage(message: EmailMessage): Promise<EmailSendResult> {
  try {
    const client = getTransporter();
    if (!client) {
      return { sent: false, error: 'email_not_configured' };
    }

    const recipients = message.to.map((addr) => addr.trim()).filter(Boolean);
    if (recipients.length === 0) {
      return { sent: false, error: 'no_recipients' };
    }

    await client.sendMail({
      from: `"Ogeemo Notifications" <${NOTIFICATIONS_EMAIL}>`,
      to: recipients.join(', '),
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    console.info(`[Email Service] Mail sent -> ${recipients.join(', ')}`);
    return { sent: true };
  } catch (error: any) {
    console.error('[Email Service] Failed to send email:', error?.message || error);
    return { sent: false, error: error?.message || 'unknown_error' };
  }
}

export async function sendFormNotification(
  payload: FormNotificationPayload
): Promise<EmailSendResult> {
  const { subject, text, html } = buildFormNotificationEmail(payload);
  return sendEmailMessage({
    to: resolveRecipients(payload),
    subject,
    text,
    html,
    replyTo: payload.replyTo,
  });
}