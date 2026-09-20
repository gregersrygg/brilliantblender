#!/usr/bin/env node
// Usage: node scripts/apply-set-legality.mjs < <detect-new-sets output>
//
// Reads a JSON array of newly-released sets on stdin (from detect-new-sets.mjs)
// and writes their `legalFrom` into src/data/set-legality.json, deterministically
// — no LLM. This is the release-time counterpart to the pre-release pipeline that
// fills upcoming-sets.json.
//
//   - Main sets:    legalFrom = releaseDate + 14 (they release on a Friday, so this
//                   lands on the "second Friday following" of Handbook §4.1.2).
//   - Special sets: legalFrom is anchored to the ETB / Booster-Bundle date, which the
//                   upcoming-sets pipeline has already scraped into `legalProductDate`.
//                   We match the releasing set to its upcoming-sets entry (by name, or
//                   set code) and compute legalDateFromAnchor(legalProductDate). The
//                   matched entry also decides special-ness (its isSpecialSet), since the
//                   input flag from detect-new-sets misclassifies special sets whose API
//                   id lacks a `ptN` suffix.
//
// Any special set with no matching upcoming-sets entry / no legalProductDate can't be
// computed here — it's printed to stdout so the caller can flag it. In practice the
// biweekly gate workflow fills legalProductDate well before release, so this is rare.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { legalDateFromAnchor } from '../src/lib/legality.js';

function addDays(yyyymmdd, days) {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400_000;
  return new Date(t).toISOString().slice(0, 10);
}

const norm = (s) => (s ?? '').trim().toLowerCase();

// Find the upcoming-sets entry for a releasing set: prefer the printed set code
// (ptcgoCode ↔ upcoming setCode), fall back to the set name.
function findUpcoming(upcoming, set) {
  const byCode = set.ptcgoCode
    ? upcoming.find((u) => norm(u.setCode) === norm(set.ptcgoCode))
    : null;
  return byCode ?? upcoming.find((u) => norm(u.name) === norm(set.name)) ?? null;
}

/**
 * Merges legalFrom for each newly-released set into `legality` (mutated and returned).
 * @returns {{ legality: object, unresolved: Array }} unresolved = special sets with no
 *   matching upcoming entry / no legalProductDate, which can't be computed here.
 */
export function applyLegality(input, legality, upcoming, fetchedAt) {
  const unresolved = [];
  for (const set of input) {
    const entry = findUpcoming(upcoming, set);
    // detect-new-sets infers special-ness from the API set id (`ptN` suffix), which misses
    // special sets whose id lacks it (30th Celebration = me55). The announcement pipeline
    // marks them reliably, so trust the matched upcoming entry's isSpecialSet over the input.
    const isSpecial = entry ? entry.isSpecialSet : set.isSpecialSet;

    if (!isSpecial) {
      legality[set.setId] = {
        name: set.name,
        releaseDate: set.releaseDate,
        isSpecialSet: false,
        legalFrom: addDays(set.releaseDate, 14),
        sourceUrl: null,
        fetchedAt,
      };
      continue;
    }

    if (!entry || typeof entry.legalProductDate !== 'string') {
      unresolved.push(set);
      continue;
    }
    legality[set.setId] = {
      name: set.name,
      releaseDate: set.releaseDate,
      isSpecialSet: true,
      legalFrom: legalDateFromAnchor(entry.legalProductDate),
      sourceUrl: entry.sourceUrl ?? null,
      fetchedAt,
    };
  }
  return { legality, unresolved };
}

// Entrypoint: run the IO when invoked as a script (not when imported by a test).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const legalityPath = resolve(__dirname, '../src/data/set-legality.json');
  const upcomingPath = resolve(__dirname, '../src/data/upcoming-sets.json');
  const fetchedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const input = JSON.parse(readFileSync(0, 'utf8') || '[]');
  const legality = JSON.parse(readFileSync(legalityPath, 'utf8'));
  const upcoming = JSON.parse(readFileSync(upcomingPath, 'utf8'));

  const { unresolved } = applyLegality(input, legality, upcoming, fetchedAt);

  writeFileSync(legalityPath, JSON.stringify(legality, null, 2) + '\n');
  process.stdout.write(JSON.stringify(unresolved));
}
