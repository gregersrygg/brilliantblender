import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reconcileEntries } from './reconcile-upcoming.mjs';

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

test('restores a setCode the agent nulled out', () => {
  const previous = [base()];
  const current = [{ ...base(), setCode: null }];
  const [out] = reconcileEntries(current, previous);
  assert.equal(out.setCode, '30C');
});

test('keeps the prior fetchedAt when only setCode was (wrongly) nulled', () => {
  // Restoring setCode makes the entry identical to HEAD, so it counts as untouched.
  const previous = [base()];
  const current = [{ ...base(), setCode: null, fetchedAt: '2026-09-04T22:18:49Z' }];
  const [out] = reconcileEntries(current, previous);
  assert.equal(out.setCode, '30C');
  assert.equal(out.fetchedAt, '2026-09-03T21:48:47Z');
});

test('reverts a spurious fetchedAt bump on an otherwise-unchanged entry', () => {
  const previous = [{ ...base(), setCode: null }];
  const current = [{ ...base(), setCode: null, fetchedAt: '2026-09-04T22:18:49Z' }];
  const [out] = reconcileEntries(current, previous);
  assert.equal(out.fetchedAt, '2026-09-03T21:48:47Z');
});

test('keeps a fresh fetchedAt when a field actually changed', () => {
  const previous = [base()];
  const current = [
    {
      ...base(),
      legalProductDate: '2026-09-16',
      sourceUrl: 'https://press.pokemon.com/en/releases/lineup',
      fetchedAt: '2026-09-04T22:18:49Z',
    },
  ];
  const [out] = reconcileEntries(current, previous);
  assert.equal(out.legalProductDate, '2026-09-16');
  assert.equal(out.sourceUrl, 'https://press.pokemon.com/en/releases/lineup');
  assert.equal(out.fetchedAt, '2026-09-04T22:18:49Z');
});

test('does not touch a newly-added set (no prior match)', () => {
  const previous = [base()];
  const added = {
    ...base(),
    name: 'Delta Reign',
    setCode: null,
    fetchedAt: '2026-09-04T22:18:49Z',
  };
  const out = reconcileEntries([base(), added], previous);
  assert.equal(out.length, 2);
  assert.deepEqual(out[1], added);
});

test('does not resurrect a setCode when the agent legitimately set a new one', () => {
  // Human could re-key by name; if the agent supplies a non-null code we leave it.
  const previous = [{ ...base(), setCode: null }];
  const current = [{ ...base(), setCode: '30C' }];
  const [out] = reconcileEntries(current, previous);
  assert.equal(out.setCode, '30C');
});

test('leaves a matched, genuinely-unchanged entry untouched', () => {
  const previous = [base()];
  const current = [base()];
  const [out] = reconcileEntries(current, previous);
  assert.deepEqual(out, base());
});
