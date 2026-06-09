import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateEntry,
  validateUpcomingFile,
  ensureOnlyAllowedPathChanged,
  ValidationError,
  ALLOWED_HOSTS,
  ALLOWED_PATH,
} from './validate-upcoming.mjs';

const goodEntry = () => ({
  setCode: null,
  name: 'Pitch Black',
  series: 'Mega Evolution',
  releaseDate: '2026-07-17',
  prereleaseDate: '2026-07-04',
  isSpecialSet: false,
  sourceUrl: 'https://press.pokemon.com/en/releases/MEDIA-ALERT-Pitch-Black',
  fetchedAt: '2026-06-09T00:00:00Z',
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
  assert.doesNotThrow(() => validateEntry('upcoming[0]', goodEntry()));
});

test('validateEntry accepts a backfilled setCode', () => {
  assert.doesNotThrow(() => validateEntry('upcoming[0]', { ...goodEntry(), setCode: 'CRI' }));
  assert.doesNotThrow(() => validateEntry('upcoming[0]', { ...goodEntry(), setCode: 'B2' }));
});

test('validateEntry rejects a malformed setCode (lowercase / too long)', () => {
  assertRejects(() => validateEntry('upcoming[0]', { ...goodEntry(), setCode: 'cri' }), 'setCode');
  assertRejects(() => validateEntry('upcoming[0]', { ...goodEntry(), setCode: 'TOOLONG' }), 'setCode');
});

test('validateEntry rejects a non-string, non-null setCode', () => {
  assertRejects(() => validateEntry('upcoming[0]', { ...goodEntry(), setCode: 5 }), 'setCode');
});

test('validateEntry rejects missing name', () => {
  assertRejects(() => validateEntry('upcoming[0]', { ...goodEntry(), name: '' }), 'name');
});

test('validateEntry rejects missing series', () => {
  assertRejects(() => validateEntry('upcoming[0]', { ...goodEntry(), series: '' }), 'series');
});

test('validateEntry rejects slash-formatted releaseDate', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), releaseDate: '2026/07/17' }),
    'releaseDate',
  );
});

test('validateEntry rejects slash-formatted prereleaseDate', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), prereleaseDate: '2026/07/04' }),
    'prereleaseDate',
  );
});

test('validateEntry accepts null prereleaseDate (special set / no prerelease)', () => {
  assert.doesNotThrow(() =>
    validateEntry('upcoming[0]', { ...goodEntry(), isSpecialSet: true, prereleaseDate: null }),
  );
});

test('validateEntry rejects prereleaseDate after releaseDate', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), prereleaseDate: '2026-07-20' }),
    'after releaseDate',
  );
});

test('validateEntry accepts prereleaseDate equal to releaseDate', () => {
  assert.doesNotThrow(() =>
    validateEntry('upcoming[0]', { ...goodEntry(), prereleaseDate: '2026-07-17' }),
  );
});

test('validateEntry rejects a main set (isSpecialSet false) with no prereleaseDate', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), isSpecialSet: false, prereleaseDate: null }),
    'inconsistent',
  );
});

test('validateEntry rejects a special set (isSpecialSet true) that has a prereleaseDate', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), isSpecialSet: true, prereleaseDate: '2026-07-04' }),
    'inconsistent',
  );
});

test('validateEntry rejects non-boolean isSpecialSet', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), isSpecialSet: 'false' }),
    'isSpecialSet',
  );
});

test('validateEntry rejects sourceUrl from outside press.pokemon.com', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), sourceUrl: 'https://community.pokemon.com/post/1' }),
    'allow-list',
  );
});

test('validateEntry rejects malformed sourceUrl', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), sourceUrl: 'not-a-url' }),
    'valid URL',
  );
});

test('validateEntry rejects a non-HTTPS sourceUrl', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), sourceUrl: 'http://press.pokemon.com/en/releases/x' }),
    'https',
  );
});

test('validateEntry rejects null sourceUrl', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), sourceUrl: null }),
    'sourceUrl',
  );
});

test('validateEntry rejects non-ISO fetchedAt', () => {
  assertRejects(
    () => validateEntry('upcoming[0]', { ...goodEntry(), fetchedAt: '2026-06-09 00:00' }),
    'fetchedAt',
  );
});

test('validateUpcomingFile rejects object root', () => {
  assertRejects(() => validateUpcomingFile({}), 'array');
});

test('validateUpcomingFile rejects null root', () => {
  assertRejects(() => validateUpcomingFile(null), 'array');
});

test('validateUpcomingFile accepts an empty array', () => {
  assert.doesNotThrow(() => validateUpcomingFile([]));
});

test('validateUpcomingFile validates every entry with its index', () => {
  const data = [goodEntry(), { ...goodEntry(), name: '' }];
  assertRejects(() => validateUpcomingFile(data), 'upcoming\\[1\\].name');
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

test('ALLOWED_PATH points at upcoming-sets.json', () => {
  assert.equal(ALLOWED_PATH, 'src/data/upcoming-sets.json');
});

test('ALLOWED_HOSTS is limited to press.pokemon.com', () => {
  assert.deepEqual(ALLOWED_HOSTS, ['press.pokemon.com']);
});
