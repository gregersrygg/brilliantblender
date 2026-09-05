#!/usr/bin/env node
// Merges the upcoming-sets agent's proposal into the canonical data file.
// See docs/architecture.md → "Data pipelines" for the why and the field ownership.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const canonicalPath = resolve(repoRoot, 'src/data/upcoming-sets.json');
const proposalPath = resolve(repoRoot, 'src/data/upcoming-sets.proposed.json');

// Entry values are primitives, so identity comparison is a deep comparison.
function entriesEqualExcept(a, b, ignoreKey) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.delete(ignoreKey);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

// `proposed` decides membership and order; `existing` only supplies human-owned fields.
export function mergeUpcoming(proposed, existing) {
  const existingByName = new Map(existing.map((entry) => [entry.name, entry]));
  return proposed.map((entry) => {
    const prior = existingByName.get(entry.name);
    if (!prior) return entry;

    let result = entry;
    // setCode is backfilled by hand and never in the proposal — carry it across.
    if (result.setCode == null && prior.setCode != null) {
      result = { ...result, setCode: prior.setCode };
    }
    // fetchedAt marks a real change, so don't re-stamp an otherwise-unchanged entry.
    if (entriesEqualExcept(result, prior, 'fetchedAt')) {
      result = { ...result, fetchedAt: prior.fetchedAt };
    }
    return result;
  });
}

function main() {
  if (!existsSync(proposalPath)) {
    console.log('merge-upcoming: no proposal file — nothing to merge.');
    return;
  }
  const proposed = JSON.parse(readFileSync(proposalPath, 'utf8'));
  const existing = existsSync(canonicalPath)
    ? JSON.parse(readFileSync(canonicalPath, 'utf8'))
    : [];

  const merged = mergeUpcoming(proposed, existing);
  const next = `${JSON.stringify(merged, null, 2)}\n`;
  const current = existsSync(canonicalPath) ? readFileSync(canonicalPath, 'utf8') : null;
  if (next === current) {
    console.log('merge-upcoming: no changes after merge.');
    return;
  }
  writeFileSync(canonicalPath, next);
  console.log(`merge-upcoming: wrote ${merged.length} entries to upcoming-sets.json.`);
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main();
}
