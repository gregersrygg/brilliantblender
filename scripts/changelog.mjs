import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' });

/** Return a fragment's single item, throwing if it is empty or spans several lines. */
export function parseFragment(text, file = 'fragment') {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error(`changelog: ${file} is empty — a fragment holds exactly one line`);
  if (lines.length > 1) {
    throw new Error(`changelog: ${file} has ${lines.length} lines — a fragment holds exactly one item; add one file per change`);
  }
  return lines[0];
}

/**
 * Merge fragment files and frozen history into the CHANGELOG shape.
 * @param {{ file: string, text: string }[]} fragments
 * @param {Record<string, number>} times file → epoch ms it was added on main
 * @param {{ date: string, items: string[] }[]} history legacy entries
 * @param {number} now epoch ms used for fragments with no git time
 * @returns {{ date: string, items: string[] }[]} newest date first
 */
export function buildChangelog(fragments, times, history, now) {
  const dated = fragments
    .map(({ file, text }) => ({ file, time: times[file] ?? now, item: parseFragment(text, file) }))
    .sort((a, b) => b.time - a.time || a.file.localeCompare(b.file));

  const byDate = new Map();
  const bucket = (date) => byDate.get(date) ?? byDate.set(date, []).get(date);
  for (const f of dated) bucket(dayFmt.format(new Date(f.time))).push(f.item);
  for (const entry of history) bucket(entry.date).push(...entry.items);

  return [...byDate]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, items]) => ({ date, items }));
}

/** Map each file name in `dir` to the epoch ms of the first-parent commit that added it. */
export function gitAddedTimes(dir) {
  const times = {};
  try {
    const out = execFileSync(
      'git',
      ['-c', 'core.quotePath=false', 'log', '--first-parent', '--no-renames', '--diff-filter=A',
        '--relative', '--format=@%ct', '--name-only', '--', '.'],
      { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    let time = null;
    for (const line of out.split('\n')) {
      if (line.startsWith('@')) time = Number(line.slice(1)) * 1000;
      else if (line && time !== null) times[line] = time; // log is newest-first, so the earliest add wins
    }
  } catch {
    return {};
  }
  return times;
}

/** Read `dir`'s fragments + history.json and build the CHANGELOG, dated from git. */
export function loadChangelog(dir, now = Date.now()) {
  const names = readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
  const fragments = names.map((file) => ({ file, text: readFileSync(join(dir, file), 'utf8') }));
  const history = JSON.parse(readFileSync(join(dir, 'history.json'), 'utf8'));
  return {
    changelog: buildChangelog(fragments, gitAddedTimes(dir), history, now),
    files: [...names, 'history.json'].map((f) => join(dir, f)),
  };
}
