#!/usr/bin/env node
// Merge the upcoming-sets agent's *proposal* into the canonical data file.
//
// The agent never writes src/data/upcoming-sets.json directly — it writes a proposal
// to src/data/upcoming-sets.proposed.json (gitignored, ephemeral). This trusted
// post-step merges that proposal onto the current committed data and is the ONLY thing
// that writes the canonical file. That split keeps the agent physically unable to
// clobber human-owned data: the worst a bad run can do is emit a bad proposal, which
// this merge (and the validator after it) reject.
//
// Field ownership across the merge:
//   - The agent (proposal) owns membership and all press-release fields: which sets
//     exist, name/series, release/prerelease dates, isSpecialSet, legalProductDate,
//     sourceUrl.
//   - The human owns setCode (backfilled by hand after release — never in the press
//     release), so we carry a non-null setCode across from the existing entry even
//     though the agent always proposes null.
//   - fetchedAt is a "last actually changed" marker: keep the existing value on an
//     entry whose other fields are unchanged, so an untouched set is not falsely
//     re-stamped just because the agent regenerated the whole file.
// Entries are matched between proposal and existing data by `name`.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const canonicalPath = resolve(repoRoot, 'src/data/upcoming-sets.json');
const proposalPath = resolve(repoRoot, 'src/data/upcoming-sets.proposed.json');

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

// Merge the agent's proposed array onto the existing (committed) array. Pure and
// side-effect free so it can be unit-tested without the filesystem. `proposed` decides
// the result's membership and order; `existing` only supplies human-owned fields to
// carry across (see the field-ownership note above).
export function mergeUpcoming(proposed, existing) {
  const existingByName = new Map(existing.map((entry) => [entry.name, entry]));
  return proposed.map((entry) => {
    const prior = existingByName.get(entry.name);
    if (!prior) return entry; // newly-added set — nothing to carry across

    let result = entry;

    // Carry a hand-backfilled set code across; the agent always proposes null.
    if (result.setCode == null && prior.setCode != null) {
      result = { ...result, setCode: prior.setCode };
    }

    // If nothing else moved, keep the prior fetchedAt so an untouched set isn't
    // falsely marked refreshed.
    if (entriesEqualExcept(result, prior, 'fetchedAt')) {
      result = { ...result, fetchedAt: prior.fetchedAt };
    }

    return result;
  });
}

function main() {
  if (!existsSync(proposalPath)) {
    // The agent produced no proposal (e.g. a genuine no-op run). Leave canonical as-is.
    console.log('merge-upcoming: no proposal file — nothing to merge.');
    return;
  }
  const proposed = JSON.parse(readFileSync(proposalPath, 'utf8'));
  const existing = existsSync(canonicalPath)
    ? JSON.parse(readFileSync(canonicalPath, 'utf8'))
    : []; // first run: no canonical file yet

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
