import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateEntry,
  validateLegalityFile,
  ensureNoDroppedEntries,
  ensureOnlyAllowedPathChanged,
  ValidationError,
  ALLOWED_HOSTS,
  ALLOWED_PATH,
} from './validate-legality.mjs';

const goodEntry = () => ({
  name: 'Chaos Rising',
  releaseDate: '2026-05-22',
  isSpecialSet: false,
  legalFrom: '2026-06-05',
  sourceUrl: 'https://press.pokemon.com/en/press-release/123/chaos-rising',
  fetchedAt: '2026-05-25T08:00:00Z',
});

function assertRejects(fn, expectedFragment) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ValidationError, `expected ValidationError, got ${error}`);
    assert.match(error.message, new RegExp(expectedFragment, 'i'));
    return;
  }
  assert.fail(`expected validation to fail with /${expectedFragment}/`);
}

test('validateEntry accepts a well-formed entry', () => {
  assert.doesNotThrow(() => validateEntry('me4', goodEntry()));
});

test('validateEntry rejects invalid setId', () => {
  assertRejects(() => validateEntry('not valid!', goodEntry()), 'invalid setId');
});

test('validateEntry rejects missing name', () => {
  assertRejects(() => validateEntry('me4', { ...goodEntry(), name: '' }), 'name');
});

test('validateEntry rejects slash-formatted releaseDate', () => {
  assertRejects(
    () => validateEntry('me4', { ...goodEntry(), releaseDate: '2026/05/22' }),
    'releaseDate',
  );
});

test('validateEntry rejects slash-formatted legalFrom', () => {
  assertRejects(
    () => validateEntry('me4', { ...goodEntry(), legalFrom: '2026/06/05' }),
    'legalFrom',
  );
});

test('validateEntry rejects non-boolean isSpecialSet', () => {
  assertRejects(
    () => validateEntry('me4', { ...goodEntry(), isSpecialSet: 'false' }),
    'isSpecialSet',
  );
});

test('validateEntry rejects sourceUrl from outside press.pokemon.com', () => {
  assertRejects(
    () => validateEntry('me4', { ...goodEntry(), sourceUrl: 'https://community.pokemon.com/post/1' }),
    'allow-list',
  );
});

test('validateEntry rejects malformed sourceUrl', () => {
  assertRejects(
    () => validateEntry('me4', { ...goodEntry(), sourceUrl: 'not-a-url' }),
    'valid URL',
  );
});

test('validateEntry rejects non-ISO fetchedAt', () => {
  assertRejects(
    () => validateEntry('me4', { ...goodEntry(), fetchedAt: '2026-05-25 08:00' }),
    'fetchedAt',
  );
});

test('validateEntry rejects legalFrom earlier than releaseDate', () => {
  assertRejects(
    () => validateEntry('me4', { ...goodEntry(), legalFrom: '2026-05-15' }),
    'precedes releaseDate',
  );
});

test('validateEntry accepts legalFrom equal to releaseDate', () => {
  assert.doesNotThrow(() =>
    validateEntry('me4', { ...goodEntry(), legalFrom: '2026-05-22' }),
  );
});

test('validateLegalityFile rejects array root', () => {
  assertRejects(() => validateLegalityFile([]), 'object');
});

test('validateLegalityFile rejects null root', () => {
  assertRejects(() => validateLegalityFile(null), 'object');
});

test('validateLegalityFile accepts empty object', () => {
  assert.doesNotThrow(() => validateLegalityFile({}));
});

test('validateLegalityFile validates every entry', () => {
  const data = { me4: goodEntry(), me5: { ...goodEntry(), name: '' } };
  assertRejects(() => validateLegalityFile(data), 'me5.name');
});

test('ensureNoDroppedEntries permits additions', () => {
  assert.doesNotThrow(() => ensureNoDroppedEntries({ me1: {} }, { me1: {}, me2: {} }));
});

test('ensureNoDroppedEntries rejects removals', () => {
  assertRejects(
    () => ensureNoDroppedEntries({ me1: {}, me2: {} }, { me1: {} }),
    'me2',
  );
});

test('ensureOnlyAllowedPathChanged accepts the allowed path alone', () => {
  assert.doesNotThrow(() => ensureOnlyAllowedPathChanged([ALLOWED_PATH]));
});

test('ensureOnlyAllowedPathChanged accepts an empty diff', () => {
  assert.doesNotThrow(() => ensureOnlyAllowedPathChanged([]));
});

test('ensureOnlyAllowedPathChanged rejects other paths', () => {
  assertRejects(
    () => ensureOnlyAllowedPathChanged([ALLOWED_PATH, 'scripts/build-card-snapshot.mjs']),
    'build-card-snapshot.mjs',
  );
});

test('ALLOWED_HOSTS is limited to press.pokemon.com', () => {
  assert.deepEqual(ALLOWED_HOSTS, ['press.pokemon.com']);
});
