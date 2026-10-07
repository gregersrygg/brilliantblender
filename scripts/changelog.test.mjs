import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { buildChangelog, gitAddedTimes, loadChangelog, parseFragment } from './changelog.mjs';
import { newFragmentName, writeFragment } from './new-changelog.mjs';

const at = (iso) => Date.parse(iso);
const frag = (file, item) => ({ file, text: `${item}\n` });
const tempDir = (prefix) => mkdtempSync(join(tmpdir(), prefix));

test('groups fragments merged on the same Oslo day under one date', () => {
  const out = buildChangelog(
    [frag('a.txt', 'A'), frag('b.txt', 'B')],
    { 'a.txt': at('2026-10-01T08:00:00Z'), 'b.txt': at('2026-10-01T20:00:00Z') },
    [],
    0,
  );
  assert.deepEqual(out, [{ date: '2026-10-01', items: ['B', 'A'] }]);
});

test('buckets by Europe/Oslo day, not UTC', () => {
  const out = buildChangelog([frag('a.txt', 'A')], { 'a.txt': at('2026-10-01T22:30:00Z') }, [], 0);
  assert.equal(out[0].date, '2026-10-02');
});

test('orders dates descending and items newest merge first', () => {
  const out = buildChangelog(
    [frag('old.txt', 'Old'), frag('new.txt', 'New'), frag('mid.txt', 'Mid')],
    {
      'old.txt': at('2026-09-01T12:00:00Z'),
      'mid.txt': at('2026-10-01T09:00:00Z'),
      'new.txt': at('2026-10-01T15:00:00Z'),
    },
    [],
    0,
  );
  assert.deepEqual(out, [
    { date: '2026-10-01', items: ['New', 'Mid'] },
    { date: '2026-09-01', items: ['Old'] },
  ]);
});

test('breaks same-commit ties by file name', () => {
  const t = at('2026-10-01T12:00:00Z');
  const out = buildChangelog(
    [frag('zesty-owls.txt', 'Z'), frag('brave-otters.txt', 'B')],
    { 'zesty-owls.txt': t, 'brave-otters.txt': t },
    [],
    0,
  );
  assert.deepEqual(out[0].items, ['B', 'Z']);
});

test('dates a fragment with no git time as now', () => {
  const now = at('2026-10-07T10:00:00Z');
  const out = buildChangelog(
    [frag('new.txt', 'Uncommitted'), frag('old.txt', 'Committed')],
    { 'old.txt': at('2026-10-05T10:00:00Z') },
    [],
    now,
  );
  assert.deepEqual(out, [
    { date: '2026-10-07', items: ['Uncommitted'] },
    { date: '2026-10-05', items: ['Committed'] },
  ]);
});

test('merges history entries, generated items first on a shared date', () => {
  const history = [
    { date: '2026-10-06', items: ['Legacy same day'] },
    { date: '2026-09-27', items: ['Legacy older'] },
  ];
  const out = buildChangelog(
    [frag('a.txt', 'Generated'), frag('b.txt', 'Newest')],
    { 'a.txt': at('2026-10-06T12:00:00Z'), 'b.txt': at('2026-10-08T12:00:00Z') },
    history,
    0,
  );
  assert.deepEqual(out, [
    { date: '2026-10-08', items: ['Newest'] },
    { date: '2026-10-06', items: ['Generated', 'Legacy same day'] },
    { date: '2026-09-27', items: ['Legacy older'] },
  ]);
});

test('parseFragment trims a single line and tolerates surrounding blank lines', () => {
  assert.equal(parseFragment('  Search is faster.  \n', 'x.txt'), 'Search is faster.');
  assert.equal(parseFragment('\nNo trailing newline', 'x.txt'), 'No trailing newline');
});

test('parseFragment rejects empty and multi-line fragments, naming the file', () => {
  assert.throws(() => parseFragment('\n \n', 'empty.txt'), /empty\.txt is empty/);
  assert.throws(() => parseFragment('One\nTwo\n', 'two.txt'), /two\.txt has 2 lines/);
});

test('loadChangelog reads only .txt fragments', () => {
  const dir = tempDir('changelog-load-');
  try {
    writeFileSync(join(dir, 'history.json'), JSON.stringify([{ date: '2020-01-01', items: ['Old'] }]));
    writeFileSync(join(dir, 'brave-calm-owls.txt'), 'Fragment item\n');
    writeFileSync(join(dir, 'README.md'), '# Not a fragment\n\nMany lines\n');
    const { changelog } = loadChangelog(dir, at('2026-10-07T10:00:00Z'));
    assert.deepEqual(changelog, [
      { date: '2026-10-07', items: ['Fragment item'] },
      { date: '2020-01-01', items: ['Old'] },
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('newFragmentName returns <adj>-<adj>-<noun>.txt', () => {
  assert.match(newFragmentName(() => false), /^[a-z]+-[a-z]+-[a-z]+\.txt$/);
});

test('newFragmentName retries when the name is taken', () => {
  const seen = [];
  const name = newFragmentName((n) => {
    seen.push(n);
    return seen.length < 3;
  });
  assert.equal(seen.length, 3);
  assert.equal(name, seen[2]);
});

test('newFragmentName gives up after maxTries', () => {
  assert.throws(() => newFragmentName(() => true, Math.random, 5), /no free fragment name/);
});

test('writeFragment writes one trimmed line and skips an existing name', () => {
  const dir = tempDir('changelog-write-');
  try {
    const rand = () => 0; // always yields the same name, forcing a collision on the second write
    const first = writeFragment(dir, '  First change  ', rand);
    assert.equal(readFileSync(first, 'utf8'), 'First change\n');
    let calls = 0;
    const second = writeFragment(dir, 'Second change', () => (calls++ < 3 ? 0 : 0.5));
    assert.notEqual(basename(second), basename(first));
    assert.equal(readFileSync(second, 'utf8'), 'Second change\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeFragment rejects empty and multi-line text', () => {
  const dir = tempDir('changelog-reject-');
  try {
    assert.throws(() => writeFragment(dir, '   '), /empty/);
    assert.throws(() => writeFragment(dir, 'One\nTwo'), /single line/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('gitAddedTimes maps each file to the commit that added it', () => {
  const repo = tempDir('changelog-test-');
  try {
    const dir = join(repo, 'changelog');
    mkdirSync(dir);
    const git = (args, date) =>
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
        cwd: repo,
        env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
      });
    git(['init', '-q']);
    writeFileSync(join(dir, 'a.txt'), 'A\n');
    git(['add', '.']);
    git(['commit', '-qm', 'a'], '2026-10-01T12:00:00Z');
    writeFileSync(join(dir, 'a.txt'), 'A edited\n');
    writeFileSync(join(dir, 'b.txt'), 'B\n');
    git(['add', '.']);
    git(['commit', '-qm', 'b'], '2026-10-03T12:00:00Z');
    writeFileSync(join(dir, 'c.txt'), 'uncommitted\n');

    assert.deepEqual(gitAddedTimes(dir), {
      'a.txt': at('2026-10-01T12:00:00Z'),
      'b.txt': at('2026-10-03T12:00:00Z'),
    });
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('gitAddedTimes returns {} outside a git repo', () => {
  const dir = tempDir('changelog-nogit-');
  try {
    assert.deepEqual(gitAddedTimes(dir), {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
