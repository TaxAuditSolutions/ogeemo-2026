import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endFollowsStart, presetHourValue, presetMinuteValue, resolveStartClock, oneHourLaterValue, resolveScheduledWindow, type ScheduleWindowInput } from '../src/lib/schedule-dates';

const day = (iso: string) => new Date(iso);

test('endFollowsStart: empty End follows a newly chosen Start (autopopulate)', () => {
    assert.equal(endFollowsStart(undefined, undefined), true);
    assert.equal(endFollowsStart(day('2026-10-05'), undefined), true);
});

test('endFollowsStart: End derived from the previous Start keeps following it', () => {
    const start = day('2026-10-05');
    assert.equal(endFollowsStart(start, day('2026-10-05')), true);
});

test('endFollowsStart: a hand-set multi-day End is never stomped by a Start change', () => {
    assert.equal(endFollowsStart(day('2026-10-05'), day('2026-10-10')), false);
    assert.equal(endFollowsStart(day('2026-10-06'), day('2026-10-10')), false);
});

test('endFollowsStart: End chosen before Start stays put', () => {
    assert.equal(endFollowsStart(undefined, day('2026-10-10')), false);
});

test('presetHourValue: zero-pads to the hour select format', () => {
    assert.equal(presetHourValue(new Date('2026-10-05T09:07:00')), '09');
    assert.equal(presetHourValue(new Date('2026-10-05T23:59:00')), '23');
    assert.equal(presetHourValue(new Date('2026-10-05T00:30:00')), '00');
});

test('presetMinuteValue: floors to the 5-minute step (never a future time)', () => {
    assert.equal(presetMinuteValue(new Date('2026-10-05T14:37:00')), '35');
    assert.equal(presetMinuteValue(new Date('2026-10-05T14:00:00')), '00');
    assert.equal(presetMinuteValue(new Date('2026-10-05T14:59:00')), '55');
});

test('resolveStartClock: untouched Start uses the current time, not the page-load preset', () => {
    const now = new Date('2026-10-05T14:37:00');
    assert.deepEqual(resolveStartClock(now, false, '09', '00'), { hour: 14, minute: 37 });
});

test('resolveStartClock: a user-chosen time is preserved', () => {
    const now = new Date('2026-10-05T14:37:00');
    assert.deepEqual(resolveStartClock(now, true, '08', '30'), { hour: 8, minute: 30 });
});

test('resolveStartClock: touched hour without minute falls back to now\'s minute', () => {
    const now = new Date('2026-10-05T14:37:00');
    assert.deepEqual(resolveStartClock(now, true, '08', undefined), { hour: 8, minute: 37 });
});

test('oneHourLaterValue: one hour after now with the minute floored to 5', () => {
    assert.deepEqual(oneHourLaterValue(new Date('2026-10-05T14:37:00')), { hour: '15', minute: '35' });
    assert.deepEqual(oneHourLaterValue(new Date('2026-10-05T09:00:00')), { hour: '10', minute: '00' });
});

test('oneHourLaterValue: clamps to 23:55 so End stays inside the same day', () => {
    assert.deepEqual(oneHourLaterValue(new Date('2026-10-05T23:30:00')), { hour: '23', minute: '55' });
});

const scheduleInput = (overrides: Partial<ScheduleWindowInput> = {}): ScheduleWindowInput => ({
    enabled: true,
    startDate: new Date('2026-11-06T00:00:00'),
    endDate: undefined,
    isAllDay: false,
    startTimeTouched: false,
    startHour: '09',
    startMinute: '00',
    endHour: undefined,
    endMinute: undefined,
    now: new Date('2026-11-06T12:49:30'),
    ...overrides,
});

test('resolveScheduledWindow: Schedule switch off saves unscheduled (no start/end)', () => {
    assert.deepEqual(resolveScheduledWindow(scheduleInput({ enabled: false })), { isScheduled: false });
    assert.deepEqual(resolveScheduledWindow(scheduleInput({ startDate: undefined })), { isScheduled: false });
});

test('resolveScheduledWindow: untouched Start lands on now\'s clock time, End defaults to Start + 30 min', () => {
    const { start, end, isScheduled } = resolveScheduledWindow(scheduleInput());
    assert.equal(isScheduled, true);
    assert.equal(start?.getTime(), new Date('2026-11-06T12:49:00').getTime());
    assert.equal(end?.getTime(), new Date('2026-11-06T13:19:00').getTime());
});

test('resolveScheduledWindow: a chosen Start and End clock are honored', () => {
    const { start, end } = resolveScheduledWindow(scheduleInput({
        startTimeTouched: true, startHour: '08', startMinute: '30', endHour: '10', endMinute: '15',
    }));
    assert.equal(start?.getTime(), new Date('2026-11-06T08:30:00').getTime());
    assert.equal(end?.getTime(), new Date('2026-11-06T10:15:00').getTime());
});

test('resolveScheduledWindow: End on a later date is kept', () => {
    const { end } = resolveScheduledWindow(scheduleInput({
        startTimeTouched: true, startHour: '08', startMinute: '30',
        endDate: new Date('2026-11-07T00:00:00'), endHour: '09', endMinute: '00',
    }));
    assert.equal(end?.getTime(), new Date('2026-11-07T09:00:00').getTime());
});

test('resolveScheduledWindow: End at or before Start becomes Start + 30 minutes', () => {
    const { start, end } = resolveScheduledWindow(scheduleInput({
        startTimeTouched: true, startHour: '08', startMinute: '30', endHour: '08', endMinute: '00',
    }));
    assert.equal(end?.getTime(), (start?.getTime() ?? 0) + 30 * 60 * 1000);
});

test('resolveScheduledWindow: all-day spans the whole Start day by default', () => {
    const { start, end, isScheduled } = resolveScheduledWindow(scheduleInput({ isAllDay: true }));
    assert.equal(isScheduled, true);
    assert.equal(start?.getTime(), new Date('2026-11-06T00:00:00').getTime());
    assert.equal(end?.getTime(), new Date('2026-11-06T23:59:59.999').getTime());
});

test('resolveScheduledWindow: all-day honors a later End date', () => {
    const { end } = resolveScheduledWindow(scheduleInput({ isAllDay: true, endDate: new Date('2026-11-08T10:00:00') }));
    assert.equal(end?.getTime(), new Date('2026-11-08T23:59:59.999').getTime());
});
