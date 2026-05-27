#!/usr/bin/env node
// Usage: node scripts/apply-main-set-legality.mjs < <detect-new-sets output>
//
// Reads a JSON array of new sets on stdin (from detect-new-sets.mjs). For
// every entry where isSpecialSet is false, computes the legalFrom date
// deterministically (release date + 14 days) and writes an entry into
// src/data/set-legality.json. Prints a JSON array of the remaining special
// sets to stdout — those still need a press-release lookup for the ETB or
// Booster Bundle date, which is what the gh-aw agent does.

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const targetPath = resolve(__dirname, '../src/data/set-legality.json');

function addDays(yyyymmdd, days) {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86400_000;
  return new Date(t).toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const input = JSON.parse(readFileSync(0, 'utf8') || '[]');
const legality = JSON.parse(readFileSync(targetPath, 'utf8'));
const fetchedAt = nowIso();

const remaining = [];
for (const set of input) {
  if (set.isSpecialSet) {
    remaining.push(set);
    continue;
  }
  legality[set.setId] = {
    name: set.name,
    releaseDate: set.releaseDate,
    isSpecialSet: false,
    legalFrom: addDays(set.releaseDate, 14),
    sourceUrl: null,
    fetchedAt,
  };
}

writeFileSync(targetPath, JSON.stringify(legality, null, 2) + '\n');
process.stdout.write(JSON.stringify(remaining));
