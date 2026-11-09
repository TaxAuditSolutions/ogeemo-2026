import assert from 'node:assert/strict';
import test from 'node:test';

import { isAppointmentRequest, isCalendarQuestion, shouldProcessAsCommand } from '../src/lib/copilot-routing';

test('appointment requests are recognised, with a word for the booking and either "appointment" or a meeting with a time', () => {
  for (const yes of [
    'Book an appointment with Dana tomorrow at 3pm for 30 minutes',
    'schedule an appointment',
    'make an appointment for Friday',
    'I need to book a meeting with Dana at 3',
    'schedule a meeting with Dana tomorrow',
    'set up a call with Dana tomorrow at 10',
    'arrange a catch-up on Monday',
    'Create an appointment called Dentist 2026-11-10 at 9am',
  ]) {
    assert.equal(isAppointmentRequest(yes), true, yes);
  }
});

test('other requests that mention meetings, calls or booking are not appointment requests', () => {
  for (const no of [
    'create a meeting agenda',
    'open the Meetings page',
    'take meeting notes',
    'send me the meeting minutes',
    'book a quote for Dana',
    'schedule a meeting',
    'I had a call with Dana yesterday',
    'what is a meeting agenda',
    'open the calendar',
    '',
  ]) {
    assert.equal(isAppointmentRequest(no), false, no);
  }
});

test('questions about my own calendar are recognised, and plain navigation is not', () => {
  for (const yes of [
    "what's on my calendar tomorrow",
    'What is on my schedule this week',
    'what do I have on Friday',
    'am I free at 3 tomorrow',
    'am I busy this afternoon?',
    'do I have anything on Monday',
  ]) {
    assert.equal(isCalendarQuestion(yes), true, yes);
  }
  for (const no of ['open the calendar', 'calendar', 'what is the general ledger', 'go to my schedule', 'new contact']) {
    assert.equal(isCalendarQuestion(no), false, no);
  }
});

test('in the chat, an appointment request or calendar question goes to the assistant, not the command processor', () => {
  assert.equal(shouldProcessAsCommand('Book an appointment with Dana tomorrow at 3pm', []), false);
  assert.equal(shouldProcessAsCommand('schedule a meeting with Dana tomorrow at 3pm', []), false);
  assert.equal(shouldProcessAsCommand("what's on my calendar tomorrow", []), false);
});

test('ordinary commands still go to the command processor', () => {
  assert.equal(shouldProcessAsCommand('open the calendar', []), true);
  assert.equal(shouldProcessAsCommand('create a meeting agenda', []), true);
  assert.equal(shouldProcessAsCommand('start timer', []), true);
  assert.equal(shouldProcessAsCommand('open contacts', []), true);
});

test('answering a booking question ("book it anyway", "make it 4pm") stays in the conversation', () => {
  const clash = {
    role: 'model' as const,
    content: 'That overlaps "Team call". Nothing was booked. The next free time is 4:00 pm. Would you like to book it then, or book it anyway?',
  };
  assert.equal(shouldProcessAsCommand('book it anyway', [clash]), false);
  assert.equal(shouldProcessAsCommand('book the meeting at 4', [clash]), false);
  assert.equal(shouldProcessAsCommand('yes, 4pm', [clash]), false);
  const askTime = { role: 'model' as const, content: 'I can book "Dentist" for you tomorrow. What time should it be?' };
  assert.equal(shouldProcessAsCommand('book it for 9', [askTime]), false);
});

test('an unrelated question from the assistant does not capture the next command', () => {
  const other = { role: 'model' as const, content: 'The ledger is ready. Would you like anything else?' };
  assert.equal(shouldProcessAsCommand('open accounting', [other]), true);
});
