import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  notLegalUntil,
  todayIso,
  formatLegalDate,
  isSetLegalOn,
  addDaysIso,
  snapToFridayIso,
  legalDateFromAnchor,
} from './legality.js';

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

// §4.1.3: a reprint of a currently-playable card is legal upon the set's RELEASE date,
// not the later tournament-legal date.
const chaosRising = { releaseDate: '2026-05-22', legalFrom: '2026-06-05' };

test('notLegalUntil(isReprint) uses releaseDate instead of legalFrom', () => {
  // In the pre-legal window, a reprint is already legal (released), a new card is not.
  assert.equal(notLegalUntil(chaosRising, '2026-05-27', { isReprint: true }), null);
  assert.equal(notLegalUntil(chaosRising, '2026-05-27', { isReprint: false }), '2026-06-05');
});

test('notLegalUntil(isReprint) still warns for a reprint before the set is released', () => {
  assert.equal(notLegalUntil(chaosRising, '2026-05-20', { isReprint: true }), '2026-05-22');
});

test('addDaysIso adds days within a month', () => {
  assert.equal(addDaysIso('2026-07-17', 14), '2026-07-31');
});

test('addDaysIso rolls over month and year boundaries', () => {
  assert.equal(addDaysIso('2026-07-20', 14), '2026-08-03');
  assert.equal(addDaysIso('2026-12-25', 14), '2027-01-08');
});

test('addDaysIso handles leap day and negative offsets', () => {
  assert.equal(addDaysIso('2028-02-20', 9), '2028-02-29');
  assert.equal(addDaysIso('2026-03-01', -1), '2026-02-28');
});

test('addDaysIso returns input unchanged when not an ISO date', () => {
  assert.equal(addDaysIso('not-a-date', 14), 'not-a-date');
});

test('snapToFridayIso leaves a Friday unchanged', () => {
  assert.equal(snapToFridayIso('2026-03-06'), '2026-03-06'); // Fri
  assert.equal(snapToFridayIso('2026-10-02'), '2026-10-02'); // Fri
});

test('snapToFridayIso advances a mid-week date to the following Friday', () => {
  assert.equal(snapToFridayIso('2026-09-30'), '2026-10-02'); // Wed -> Fri
  assert.equal(snapToFridayIso('2026-09-19'), '2026-09-25'); // Sat -> next Fri
  assert.equal(snapToFridayIso('2026-09-14'), '2026-09-18'); // Mon -> Fri
});

test('snapToFridayIso returns input unchanged when not an ISO date', () => {
  assert.equal(snapToFridayIso('not-a-date'), 'not-a-date');
});

// §4.1.2.1 defers to §4.1.2's cadence: the second Friday following the ETB/Booster-Bundle anchor.
test('legalDateFromAnchor: 30th Celebration ETB (Wed 2026-09-16) -> 2nd Fri following = 2026-09-25', () => {
  assert.equal(legalDateFromAnchor('2026-09-16'), '2026-09-25');
});

test('legalDateFromAnchor: Ascended Heroes ETB (Fri 2026-02-20) -> 2nd Fri following = 2026-03-06 (also +14)', () => {
  assert.equal(legalDateFromAnchor('2026-02-20'), '2026-03-06');
});

test('isSetLegalOn: untracked set is treated as legal', () => {
  assert.equal(isSetLegalOn(undefined, '2026-05-27'), true);
});

test('isSetLegalOn: tracked set is legal only from its legalFrom date', () => {
  assert.equal(isSetLegalOn(chaosRising, '2026-05-27'), false);
  assert.equal(isSetLegalOn(chaosRising, '2026-06-05'), true);
  assert.equal(isSetLegalOn(chaosRising, '2026-06-10'), true);
});
