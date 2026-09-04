#!/usr/bin/env node
// Post-step reconciliation for the upcoming-sets agent, run AFTER the agent writes
// src/data/upcoming-sets.json and BEFORE validation/commit.
//
// The agent rewrites the whole file each run, which twice caused it to clobber data
// it had no business touching:
//   1. It nulled a `setCode` a human had backfilled (the set code isn't in the press
//      release, so it's filled in by hand later — the agent must never overwrite it).
//   2. It bumped `fetchedAt` on an entry it did not actually change, making the diff
//      (and the "chore: update upcoming sets" commit) claim a set was refreshed when
//      nothing about it moved.
//
// The prompt now tells the agent not to do either, but the prompt is advisory to an
// LLM. This step is the deterministic guarantee: match each entry to the committed
// (HEAD) version by name and
//   - restore a non-null `setCode` the agent replaced with null, and
//   - restore the previous `fetchedAt` whenever every *other* field is unchanged,
// so an untouched set keeps its original timestamp and a backfilled set code survives.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const targetPath = resolve(repoRoot, 'src/data/upcoming-sets.json');
const RELATIVE_PATH = 'src/data/upcoming-sets.json';

// True when every field of `a` and `b` matches except `ignoreKey`. Entry values are
// primitives (string / null / boolean), so identity comparison is a deep comparison.
function entriesEqualExcept(a, b, ignoreKey) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.delete(ignoreKey);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

// Reconcile the agent's array against the previously committed array (both parsed).
// Pure and side-effect free so it can be unit-tested without git or the filesystem.
export function reconcileEntries(current, previous) {
  const previousByName = new Map(previous.map((entry) => [entry.name, entry]));
  return current.map((entry) => {
    const prior = previousByName.get(entry.name);
    if (!prior) return entry; // newly-added set — nothing to reconcile against

    let result = entry;

    // 1. Never let a rewrite drop a hand-backfilled set code back to null.
    if (result.setCode == null && prior.setCode != null) {
      result = { ...result, setCode: prior.setCode };
    }

    // 2. If nothing else moved, keep the prior fetchedAt so an untouched (or only
    //    spuriously re-nulled, now restored) set is not falsely marked as refreshed.
    if (entriesEqualExcept(result, prior, 'fetchedAt')) {
      result = { ...result, fetchedAt: prior.fetchedAt };
    }

    return result;
  });
}

function readPreviousCommitted() {
  try {
    const out = execSync(`git show HEAD:${RELATIVE_PATH}`, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    return JSON.parse(out);
  } catch {
    // No committed version yet (first run) — nothing to reconcile against.
    return null;
  }
}

function main() {
  if (!existsSync(targetPath)) {
    console.log('reconcile-upcoming: no upcoming-sets.json — nothing to do.');
    return;
  }
  const previous = readPreviousCommitted();
  if (previous === null) {
    console.log('reconcile-upcoming: no committed baseline — nothing to reconcile.');
    return;
  }

  const raw = readFileSync(targetPath, 'utf8');
  const current = JSON.parse(raw);
  const reconciled = reconcileEntries(current, previous);

  const next = `${JSON.stringify(reconciled, null, 2)}\n`;
  if (next === raw) {
    console.log('reconcile-upcoming: no setCode/fetchedAt clobbering to undo.');
    return;
  }
  writeFileSync(targetPath, next);
  console.log('reconcile-upcoming: restored clobbered setCode/fetchedAt from HEAD.');
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main();
}
