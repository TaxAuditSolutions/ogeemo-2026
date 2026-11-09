'use server';

import { sendFormNotification } from '@/core/email-service';
import { getCurrentUserId } from '@/app/actions';
import { createRateLimiter } from '@/lib/ai-rate-limit';

// A signed-in person may send a handful of notices a minute; a script cannot flood the team mailbox.
const notifyLimiter = createRateLimiter({ max: 5, windowMs: 60_000 });

async function allowed(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: 'Please sign in to send this.' };
  const limit = notifyLimiter.check(userId);
  if (!limit.ok) return { ok: false, error: `Please wait ${limit.retryAfterSeconds} seconds before sending another.` };
  return { ok: true };
}

const MAX_FIELD_LENGTH = 5000;

function clampText(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, MAX_FIELD_LENGTH) : '';
}

/**
 * Notify the team mailboxes about a submitted Feedback form entry.
 * Deliberately narrow (fixed fields, length-clamped) so this action can never
 * be abused as a general-purpose email relay.
 */
export async function notifyFeedbackSubmission(input: {
  reporterName: string;
  topic: string;
  type: string;
  feedback: string;
  submittedAt?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const gate = await allowed();
  if (!gate.ok) return { sent: false, error: gate.error };
  return sendFormNotification({
    formName: 'Feedback Form',
    heading: `New Feedback (${clampText(input.type) || 'general'}) — ${clampText(input.topic) || 'No topic'}`,
    fields: [
      { label: 'From', value: clampText(input.reporterName) },
      { label: 'Type', value: clampText(input.type) },
      { label: 'Topic', value: clampText(input.topic) },
      { label: 'Feedback', value: clampText(input.feedback) },
    ],
    submittedAt: input.submittedAt,
  });
}

/**
 * Notify the team mailboxes about a Mentor Mediation request.
 */
export async function notifyMediationRequest(input: {
  requesterName: string;
  requesterEmail?: string;
  mentorName: string;
  dispute: string;
  submittedAt?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const gate = await allowed();
  if (!gate.ok) return { sent: false, error: gate.error };
  return sendFormNotification({
    formName: 'Mentor Mediation Request',
    heading: `New Mediation Request — ${clampText(input.requesterName) || 'Ogeemo user'}`,
    fields: [
      { label: 'Requester', value: clampText(input.requesterName) },
      { label: 'Requester Email', value: clampText(input.requesterEmail) },
      { label: 'Mentor', value: clampText(input.mentorName) },
      { label: 'Dispute Description', value: clampText(input.dispute) },
    ],
    replyTo: input.requesterEmail,
    submittedAt: input.submittedAt,
  });
}