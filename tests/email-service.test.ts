import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFormNotificationEmail, escapeHtml, NOTIFY_RECIPIENTS } from '../src/core/email-service';

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