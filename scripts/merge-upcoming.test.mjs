import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mergeUpcoming } from './merge-upcoming.mjs';

const base = () => ({
  setCode: '30C',
  name: '30th Celebration',
  series: '30th Celebration',
  releaseDate: '2026-09-16',
  prereleaseDate: null,
  isSpecialSet: true,
  legalProductDate: null,
  sourceUrl: 'https://press.pokemon.com/en/releases/reveal',
  fetchedAt: '2026-09-03T21:48:47Z',
});

test('carries a hand-backfilled setCode across (agent proposes null)', () => {
  const existing = [base()];
  const proposed = [{ ...base(), setCode: null }];
  const [out] = mergeUpcoming(proposed, existing);
  assert.equal(out.setCode, '30C');
});

test('keeps the prior fetchedAt when only setCode differed', () => {
  const existing = [base()];
  const proposed = [{ ...base(), setCode: null, fetchedAt: '2026-09-04T22:18:49Z' }];
  const [out] = mergeUpcoming(proposed, existing);
  assert.equal(out.setCode, '30C');
  assert.equal(out.fetchedAt, '2026-09-03T21:48:47Z');
});

test('reverts a spurious fetchedAt bump on an otherwise-unchanged entry', () => {
  const existing = [{ ...base(), setCode: null }];
  const proposed = [{ ...base(), setCode: null, fetchedAt: '2026-09-04T22:18:49Z' }];
  const [out] = mergeUpcoming(proposed, existing);
  assert.equal(out.fetchedAt, '2026-09-03T21:48:47Z');
});

test('keeps a fresh fetchedAt when a field actually changed', () => {
  const existing = [base()];
  const proposed = [
    {
      ...base(),
      legalProductDate: '2026-09-16',
      sourceUrl: 'https://press.pokemon.com/en/releases/lineup',
      fetchedAt: '2026-09-04T22:18:49Z',
    },
  ];
  const [out] = mergeUpcoming(proposed, existing);
  assert.equal(out.legalProductDate, '2026-09-16');
  assert.equal(out.sourceUrl, 'https://press.pokemon.com/en/releases/lineup');
  assert.equal(out.fetchedAt, '2026-09-04T22:18:49Z');
});

test('adds a newly-proposed set as-is (no existing match)', () => {
  const existing = [base()];
  const added = {
    ...base(),
    name: 'Delta Reign',
    setCode: null,
    fetchedAt: '2026-09-04T22:18:49Z',
  };
  const out = mergeUpcoming([base(), added], existing);
  assert.equal(out.length, 2);
  assert.deepEqual(out[1], added);
});

test('drops a set the agent no longer proposes (membership follows the proposal)', () => {
  const existing = [base(), { ...base(), name: 'Delta Reign', setCode: null }];
  const out = mergeUpcoming([base()], existing);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, '30th Celebration');
});

test('leaves a proposed setCode alone when the agent supplies a non-null one', () => {
  const existing = [{ ...base(), setCode: null }];
  const proposed = [{ ...base(), setCode: '30C' }];
  const [out] = mergeUpcoming(proposed, existing);
  assert.equal(out.setCode, '30C');
});

test('leaves a matched, genuinely-unchanged entry untouched', () => {
  const existing = [base()];
  const proposed = [base()];
  const [out] = mergeUpcoming(proposed, existing);
  assert.deepEqual(out, base());
});
