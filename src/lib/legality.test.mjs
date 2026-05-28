import { test } from 'node:test';
import assert from 'node:assert/strict';

import { notLegalUntil, todayIso, formatLegalDate } from './legality.js';

test('notLegalUntil returns legalFrom when the set is not legal yet', () => {
  const entry = { legalFrom: '2026-06-05' };
  assert.equal(notLegalUntil(entry, '2026-06-01'), '2026-06-05');
});

test('notLegalUntil returns null once today reaches legalFrom (legal that day)', () => {
  const entry = { legalFrom: '2026-06-05' };
  assert.equal(notLegalUntil(entry, '2026-06-05'), null);
});

test('notLegalUntil returns null when today is past legalFrom', () => {
  const entry = { legalFrom: '2026-06-05' };
  assert.equal(notLegalUntil(entry, '2026-06-10'), null);
});

test('notLegalUntil returns null for a missing entry', () => {
  assert.equal(notLegalUntil(undefined, '2026-06-01'), null);
  assert.equal(notLegalUntil(null, '2026-06-01'), null);
});

test('notLegalUntil returns null when entry has no legalFrom string', () => {
  assert.equal(notLegalUntil({}, '2026-06-01'), null);
  assert.equal(notLegalUntil({ legalFrom: 20260605 }, '2026-06-01'), null);
});

test('todayIso formats a Date as local YYYY-MM-DD', () => {
  assert.equal(todayIso(new Date('2026-05-27T12:00:00')), '2026-05-27');
});

test('todayIso zero-pads single-digit month and day', () => {
  assert.equal(todayIso(new Date('2026-01-09T12:00:00')), '2026-01-09');
});

test('formatLegalDate renders a readable date', () => {
  assert.equal(formatLegalDate('2026-06-05'), 'Jun 5, 2026');
  assert.equal(formatLegalDate('2026-01-01'), 'Jan 1, 2026');
  assert.equal(formatLegalDate('2026-12-31'), 'Dec 31, 2026');
});

test('formatLegalDate returns input unchanged when not an ISO date', () => {
  assert.equal(formatLegalDate('not-a-date'), 'not-a-date');
});
