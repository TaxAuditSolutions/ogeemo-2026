import assert from 'node:assert/strict';
import test from 'node:test';

import { getActivityPickerResults } from '../src/lib/activity-picker';
import { type Event as TaskEvent } from '../src/types/calendar-types';

const now = new Date('2026-11-13T12:00:00.000Z');
let nextId = 1;

function activity(overrides: Partial<TaskEvent> = {}): TaskEvent {
    return {
        id: `activity-${nextId++}`,
        title: 'Activity',
        status: 'todo',
        position: 0,
        userId: 'user-1',
        ...overrides,
    };
}

function ids(activities: TaskEvent[]): string[] {
    return activities.map((item) => item.id);
}

test('completed activities are opt-in and always follow open activities', () => {
    const done = activity({ title: 'Done', status: 'done', start: new Date('2026-11-13T09:00:00Z') });
    const open = activity({ title: 'Open', start: new Date('2026-11-13T13:00:00Z') });

    assert.deepEqual(ids(getActivityPickerResults([done, open], { now })), [open.id]);
    assert.deepEqual(ids(getActivityPickerResults([done, open], { now, showCompleted: true })), [open.id, done.id]);
});

test('search is case-insensitive and every word must match title, notes, or linked context', () => {
    const call = activity({ title: 'Call Acme', description: 'Discuss renewal', contactId: 'contact-1' });
    const invoice = activity({ title: 'Prepare invoice', contactId: 'contact-2' });
    const searchText = (item: TaskEvent) => item.contactId === 'contact-1' ? 'Acme Industries' : 'Other Co';

    assert.deepEqual(ids(getActivityPickerResults([call, invoice], { now, query: 'acme RENEWAL', searchText })), [call.id]);
    assert.deepEqual(ids(getActivityPickerResults([call, invoice], { now, query: 'acme industries', searchText })), [call.id]);
    assert.deepEqual(getActivityPickerResults([call, invoice], { now, query: 'acme invoice', searchText }), []);
});

test('scheduled work sorts as most recently past, soonest upcoming, then unscheduled', () => {
    const unscheduled = activity({ title: 'Unscheduled', updatedAt: new Date('2026-11-13T11:00:00Z') });
    const later = activity({ title: 'Later', start: new Date('2026-11-14T09:00:00Z') });
    const olderPast = activity({ title: 'Older past', start: new Date('2026-11-12T09:00:00Z') });
    const soon = activity({ title: 'Soon', start: new Date('2026-11-13T13:00:00Z') });
    const recentPast = activity({ title: 'Recent past', start: new Date('2026-11-13T10:00:00Z') });

    assert.deepEqual(
        ids(getActivityPickerResults([unscheduled, later, olderPast, soon, recentPast], { now })),
        [recentPast.id, olderPast.id, soon.id, later.id, unscheduled.id],
    );
});

test('unscheduled activities use recent update time and title as stable tie breakers', () => {
    const older = activity({ title: 'Older', updatedAt: new Date('2026-11-10T10:00:00Z') });
    const newer = activity({ title: 'Newer', updatedAt: new Date('2026-11-13T10:00:00Z') });
    const alpha = activity({ title: 'Alpha' });
    const beta = activity({ title: 'Beta' });

    assert.deepEqual(ids(getActivityPickerResults([beta, older, alpha, newer], { now })), [newer.id, older.id, alpha.id, beta.id]);
});

test('picker filtering does not mutate the source collection', () => {
    const first = activity({ title: 'First', start: new Date('2026-11-13T13:00:00Z') });
    const second = activity({ title: 'Second', start: new Date('2026-11-13T10:00:00Z') });
    const source = [first, second];

    getActivityPickerResults(source, { now });
    assert.deepEqual(ids(source), [first.id, second.id]);
});
