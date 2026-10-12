import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFormNotificationEmail,
  buildRegistrationNotification,
  escapeHtml,
  NOTIFY_RECIPIENTS,
  resolveRecipients,
  resolveSenderEmail,
} from '../src/core/email-service';

test('resolveRecipients falls back to the team mailboxes when none are given', () => {
  assert.deepEqual(resolveRecipients({}), NOTIFY_RECIPIENTS);
  assert.deepEqual(resolveRecipients({ recipients: [' ', ''] }), NOTIFY_RECIPIENTS);
});

test('resolveRecipients uses custom recipients when provided', () => {
  assert.deepEqual(resolveRecipients({ recipients: [' info@ogeemo.com '] }), ['info@ogeemo.com']);
});

test('registration notification goes to info@ogeemo.com with all registration details', () => {
  const payload = buildRegistrationNotification({
    orgName: 'Acme Inc.',
    name: 'Jane Doe',
    email: 'jane@acme.com',
    orgId: 'org-1',
    uid: 'uid-1',
  });
  const email = buildFormNotificationEmail(payload);

  assert.deepEqual(payload.recipients, ['info@ogeemo.com']);
  assert.equal(payload.replyTo, 'jane@acme.com');
  assert.equal(email.subject, '[Ogeemo] New Organization Registration — Acme Inc.');
  for (const expected of ['Acme Inc.', 'Jane Doe', 'jane@acme.com', 'org-1', 'uid-1']) {
    assert.ok(email.text.includes(expected), `missing ${expected}`);
  }
  assert.doesNotMatch(email.text, /password/i);
});

test('builds the subject line from the heading', () => {
  const email = buildFormNotificationEmail({
    formName: 'Contact Form',
    heading: 'New Connection Signal — John Smith',
    fields: [{ label: 'Email', value: 'john@example.com' }],
  });

  assert.equal(email.subject, '[Ogeemo] New Connection Signal — John Smith');
});

test('renders every non-empty field in the text body', () => {
  const email = buildFormNotificationEmail({
    formName: 'Contact Form',
    fields: [
      { label: 'Name', value: 'John Smith' },
      { label: 'Message', value: 'Hello Ogeemo team' },
      { label: 'Empty', value: '' },
    ],
  });

  assert.match(email.text, /Name: John Smith/);
  assert.match(email.text, /Message: Hello Ogeemo team/);
  assert.doesNotMatch(email.text, /Empty:/);
});

test('escapes HTML in field values so submissions cannot inject markup', () => {
  const email = buildFormNotificationEmail({
    formName: 'Contact Form',
    fields: [{ label: 'Message', value: '<script>alert("xss")</script>' }],
  });

  assert.ok(!email.html.includes('<script>'));
  assert.match(email.html, /&lt;script&gt;/);
});

test('default recipients are the Ogeemo team mailboxes', () => {
  assert.ok(NOTIFY_RECIPIENTS.includes('notifications@ogeemo.com'));
  assert.ok(NOTIFY_RECIPIENTS.includes('dan@ogeemo.com'));
});

test('escapeHtml neutralises quotes and angle brackets', () => {
  assert.equal(escapeHtml('<a href="x">&\''), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
});

test('From address follows SMTP_USER unless OGEEMO_NOTIFICATIONS_EMAIL overrides it', () => {
  assert.equal(resolveSenderEmail({ smtpUser: 'sender@example.com' }), 'sender@example.com');
  assert.equal(
    resolveSenderEmail({ smtpUser: 'sender@example.com', override: 'alias@example.com' }),
    'alias@example.com'
  );
  assert.equal(resolveSenderEmail({}), 'notifications@ogeemo.com');
});
