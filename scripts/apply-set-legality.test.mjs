import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyLegality } from './apply-set-legality.mjs';

const FETCHED = '2026-09-17T00:00:00Z';

test('main set: legalFrom = releaseDate + 14', () => {
  const input = [{ setId: 'me4', name: 'Pitch Black', ptcgoCode: 'PBL', releaseDate: '2026-07-17', isSpecialSet: false }];
  const { legality } = applyLegality(input, {}, [], FETCHED);
  assert.equal(legality.me4.legalFrom, '2026-07-31');
  assert.equal(legality.me4.isSpecialSet, false);
});

test('special set: legalFrom = second Friday following the ETB anchor, from the upcoming entry', () => {
  const input = [{ setId: 'me55', name: '30th Celebration', ptcgoCode: '30C', releaseDate: '2026-09-16', isSpecialSet: true }];
  const upcoming = [{ setCode: '30C', name: '30th Celebration', isSpecialSet: true, legalProductDate: '2026-09-16', sourceUrl: 'https://example/lineup' }];
  const { legality, unresolved } = applyLegality(input, {}, upcoming, FETCHED);
  assert.equal(unresolved.length, 0);
  assert.equal(legality.me55.isSpecialSet, true);
  assert.equal(legality.me55.legalFrom, '2026-09-25'); // ETB Wed 2026-09-16 -> 2nd Fri
  assert.equal(legality.me55.sourceUrl, 'https://example/lineup');
});

// The bug this guards: detect-new-sets marks a special set whose API id lacks a `ptN`
// suffix (30th Celebration = me55) as isSpecialSet:false. The matched upcoming entry is
// authoritative, so the anchor date wins over the misclassifying input flag.
test('special set misflagged by detect-new-sets is corrected from its upcoming entry', () => {
  const input = [{ setId: 'me55', name: '30th Celebration', ptcgoCode: '30C', releaseDate: '2026-09-16', isSpecialSet: false }];
  const upcoming = [{ setCode: '30C', name: '30th Celebration', isSpecialSet: true, legalProductDate: '2026-09-16', sourceUrl: 'https://example/lineup' }];
  const { legality } = applyLegality(input, {}, upcoming, FETCHED);
  assert.equal(legality.me55.isSpecialSet, true);
  assert.equal(legality.me55.legalFrom, '2026-09-25'); // not releaseDate+14 (2026-09-30)
});

test('special set with no matching upcoming entry is left unresolved (no legalFrom guessed)', () => {
  const input = [{ setId: 'me99pt5', name: 'Mystery', ptcgoCode: 'MYS', releaseDate: '2026-12-04', isSpecialSet: true }];
  const legality = {};
  const { unresolved } = applyLegality(input, legality, [], FETCHED);
  assert.deepEqual(unresolved.map((s) => s.setId), ['me99pt5']);
  assert.equal(legality.me99pt5, undefined);
});
