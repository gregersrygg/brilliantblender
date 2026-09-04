import { test } from 'node:test';
import assert from 'node:assert/strict';

import { legalToPlayDate, upcomingStatus, sortByReleaseDate, findSetByCode } from './upcoming.js';

// Mirrors the two live upcoming-sets.json entries at time of writing.
const mainSet = {
  setCode: 'PBL',
  name: 'Pitch Black',
  series: 'Mega Evolution',
  releaseDate: '2026-07-17',
  prereleaseDate: '2026-07-04',
  isSpecialSet: false,
};
const specialSet = {
  setCode: '30C',
  name: '30th Celebration',
  series: '30th Celebration',
  releaseDate: '2026-09-16',
  prereleaseDate: null,
  isSpecialSet: true,
  legalProductDate: '2026-09-16',
};

test('legalToPlayDate: main set is legal 14 days after release', () => {
  assert.equal(legalToPlayDate(mainSet), '2026-07-31');
});

test('legalToPlayDate: special set is unknown (null) until its ETB date is scraped', () => {
  assert.equal(legalToPlayDate({ ...specialSet, legalProductDate: null }), null);
});

test('legalToPlayDate: special set legal date = ETB anchor + 14, snapped to Friday', () => {
  // ETB 2026-09-16 (Wed) -> +14 = 2026-09-30 (Wed) -> Fri 2026-10-02.
  assert.equal(legalToPlayDate(specialSet), '2026-10-02');
});

test('legalToPlayDate: an explicit legalFrom overrides the computed date', () => {
  assert.equal(legalToPlayDate({ ...specialSet, legalFrom: '2026-10-21' }), '2026-10-21');
  assert.equal(legalToPlayDate({ ...mainSet, legalFrom: '2026-08-01' }), '2026-08-01');
});

test('legalToPlayDate: null/missing entry is unknown', () => {
  assert.equal(legalToPlayDate(null), null);
  assert.equal(legalToPlayDate({ isSpecialSet: false }), null);
});

test('upcomingStatus: announced before the prerelease window opens', () => {
  assert.equal(upcomingStatus(mainSet, '2026-07-03'), 'announced');
});

test('upcomingStatus: prerelease on the day the window opens and within it', () => {
  assert.equal(upcomingStatus(mainSet, '2026-07-04'), 'prerelease');
  assert.equal(upcomingStatus(mainSet, '2026-07-10'), 'prerelease');
});

test('upcomingStatus: released from the release date onward', () => {
  assert.equal(upcomingStatus(mainSet, '2026-07-17'), 'released');
  assert.equal(upcomingStatus(mainSet, '2026-07-20'), 'released');
});

test('upcomingStatus: a set with no prerelease date is announced until release, then released', () => {
  assert.equal(upcomingStatus(specialSet, '2026-09-10'), 'announced');
  assert.equal(upcomingStatus(specialSet, '2026-09-16'), 'released');
  assert.equal(upcomingStatus(specialSet, '2026-09-20'), 'released');
});

test('sortByReleaseDate: soonest release first, without mutating input', () => {
  const input = [specialSet, mainSet];
  const sorted = sortByReleaseDate(input);
  assert.deepEqual(sorted.map(s => s.setCode), ['PBL', '30C']);
  assert.deepEqual(input.map(s => s.setCode), ['30C', 'PBL']);
});

test('findSetByCode: case-insensitive match, else null', () => {
  const sets = [mainSet, specialSet];
  assert.equal(findSetByCode(sets, 'pbl'), mainSet);
  assert.equal(findSetByCode(sets, 'PBL'), mainSet);
  assert.equal(findSetByCode(sets, '30C'), specialSet);
  assert.equal(findSetByCode(sets, 'TWM'), null);
  assert.equal(findSetByCode(sets, ''), null);
  assert.equal(findSetByCode(sets, undefined), null);
});
