import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildChangelog, gitAddedTimes, parseFragment } from './changelog.mjs';

const at = (iso) => Date.parse(iso);
const frag = (file, ...items) => ({ file, text: items.map((i) => `- ${i}`).join('\n') + '\n' });

test('groups fragments merged on the same Oslo day under one date', () => {
  const out = buildChangelog(
    [frag('a.md', 'A'), frag('b.md', 'B')],
    { 'a.md': at('2026-10-01T08:00:00Z'), 'b.md': at('2026-10-01T20:00:00Z') },
    [],
    0,
  );
  assert.deepEqual(out, [{ date: '2026-10-01', items: ['B', 'A'] }]);
});

test('buckets by Europe/Oslo day, not UTC', () => {
  const out = buildChangelog([frag('a.md', 'A')], { 'a.md': at('2026-10-01T22:30:00Z') }, [], 0);
  assert.equal(out[0].date, '2026-10-02');
});

test('orders dates descending and items newest merge first', () => {
  const out = buildChangelog(
    [frag('old.md', 'Old'), frag('new.md', 'New'), frag('mid.md', 'Mid')],
    {
      'old.md': at('2026-09-01T12:00:00Z'),
      'mid.md': at('2026-10-01T09:00:00Z'),
      'new.md': at('2026-10-01T15:00:00Z'),
    },
    [],
    0,
  );
  assert.deepEqual(out, [
    { date: '2026-10-01', items: ['New', 'Mid'] },
    { date: '2026-09-01', items: ['Old'] },
  ]);
});

test('keeps bullet order within a multi-bullet file and joins wrapped lines', () => {
  const text = '- First item\n  wraps here\n\n- Second\n- Third\n';
  const out = buildChangelog([{ file: 'x.md', text }], { 'x.md': at('2026-10-01T12:00:00Z') }, [], 0);
  assert.deepEqual(out[0].items, ['First item wraps here', 'Second', 'Third']);
});

test('dates a fragment with no git time as now', () => {
  const now = at('2026-10-07T10:00:00Z');
  const out = buildChangelog(
    [frag('new.md', 'Uncommitted'), frag('old.md', 'Committed')],
    { 'old.md': at('2026-10-05T10:00:00Z') },
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
    [frag('a.md', 'Generated'), frag('b.md', 'Newest')],
    { 'a.md': at('2026-10-06T12:00:00Z'), 'b.md': at('2026-10-08T12:00:00Z') },
    history,
    0,
  );
  assert.deepEqual(out, [
    { date: '2026-10-08', items: ['Newest'] },
    { date: '2026-10-06', items: ['Generated', 'Legacy same day'] },
    { date: '2026-09-27', items: ['Legacy older'] },
  ]);
});

test('rejects a fragment without bullets', () => {
  assert.throws(() => parseFragment('Just prose\n', 'bad.md'), /bad\.md/);
  assert.throws(() => parseFragment('\n\n', 'empty.md'), /no "- " bullets/);
});

test('gitAddedTimes maps each file to the commit that added it', () => {
  const repo = mkdtempSync(join(tmpdir(), 'changelog-test-'));
  try {
    const dir = join(repo, 'changelog');
    mkdirSync(dir);
    const git = (args, date) =>
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
        cwd: repo,
        env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
      });
    git(['init', '-q']);
    writeFileSync(join(dir, 'a.md'), '- A\n');
    git(['add', '.']);
    git(['commit', '-qm', 'a'], '2026-10-01T12:00:00Z');
    writeFileSync(join(dir, 'a.md'), '- A edited\n');
    writeFileSync(join(dir, 'b.md'), '- B\n');
    git(['add', '.']);
    git(['commit', '-qm', 'b'], '2026-10-03T12:00:00Z');
    writeFileSync(join(dir, 'c.md'), '- uncommitted\n');

    assert.deepEqual(gitAddedTimes(dir), {
      'a.md': at('2026-10-01T12:00:00Z'),
      'b.md': at('2026-10-03T12:00:00Z'),
    });
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('gitAddedTimes returns {} outside a git repo', () => {
  const dir = mkdtempSync(join(tmpdir(), 'changelog-nogit-'));
  try {
    assert.deepEqual(gitAddedTimes(dir), {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
