#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');
const targetPath = resolve(dataDir, 'set-legality.json');

const ALLOWED_HOSTS = ['press.pokemon.com', 'community.pokemon.com', 'www.pokemon.com', 'pokemon.com'];
const DATE_RE = /^\d{4}[-/]\d{2}[-/]\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function fail(msg) {
  console.error(`validate-legality: ${msg}`);
  process.exit(1);
}

const next = JSON.parse(readFileSync(targetPath, 'utf8'));
if (next === null || typeof next !== 'object' || Array.isArray(next)) {
  fail('set-legality.json must be a JSON object');
}

for (const [setId, entry] of Object.entries(next)) {
  if (!/^[a-z0-9]+(pt\d+)?$/i.test(setId)) fail(`invalid setId: ${setId}`);
  if (!entry || typeof entry !== 'object') fail(`${setId}: entry must be an object`);
  const { name, releaseDate, isSpecialSet, legalFrom, sourceUrl, fetchedAt } = entry;
  if (typeof name !== 'string' || !name.trim()) fail(`${setId}: name required`);
  if (typeof releaseDate !== 'string' || !DATE_RE.test(releaseDate)) fail(`${setId}: releaseDate must be YYYY-MM-DD or YYYY/MM/DD`);
  if (typeof isSpecialSet !== 'boolean') fail(`${setId}: isSpecialSet must be boolean`);
  if (typeof legalFrom !== 'string' || !DATE_RE.test(legalFrom)) fail(`${setId}: legalFrom must be YYYY-MM-DD or YYYY/MM/DD`);
  if (typeof sourceUrl !== 'string') fail(`${setId}: sourceUrl required`);
  let host;
  try { host = new URL(sourceUrl).hostname; } catch { fail(`${setId}: sourceUrl not a valid URL`); }
  if (!ALLOWED_HOSTS.includes(host)) fail(`${setId}: sourceUrl host ${host} not in allowed list`);
  if (typeof fetchedAt !== 'string' || !ISO_RE.test(fetchedAt)) fail(`${setId}: fetchedAt must be ISO 8601 UTC`);

  const rd = releaseDate.replaceAll('/', '-');
  const lf = legalFrom.replaceAll('/', '-');
  if (lf < rd) fail(`${setId}: legalFrom (${lf}) precedes releaseDate (${rd})`);
}

// Refuse removals: every key in the previous committed version must still exist.
try {
  const prev = execSync('git show HEAD:src/data/set-legality.json', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  const prevObj = JSON.parse(prev || '{}');
  for (const key of Object.keys(prevObj)) {
    if (!(key in next)) fail(`refusing to drop existing entry: ${key}`);
  }
} catch {
  // First commit of the file — nothing to compare against.
}

// Guardrail: only set-legality.json may have changed in this commit window.
try {
  const diff = execSync('git diff --name-only HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  const changed = diff ? diff.split('\n') : [];
  const disallowed = changed.filter((p) => p !== 'src/data/set-legality.json');
  if (disallowed.length > 0) fail(`agent modified disallowed paths: ${disallowed.join(', ')}`);
} catch {
  // Outside a git repo — skip diff check.
}

if (!existsSync(targetPath)) fail('set-legality.json missing after agent run');
console.log(`validate-legality: ok (${Object.keys(next).length} entries)`);
