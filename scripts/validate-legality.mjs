#!/usr/bin/env node
// Post-step guard for the set-legality agent. Reads the current
// src/data/set-legality.json and refuses to let bad data reach main.
//
// The validator is deliberately strict: every check is its own function so a
// future contributor can read the file top-to-bottom and see exactly what gets
// enforced and why.

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const targetPath = resolve(repoRoot, 'src/data/set-legality.json');

export const ALLOWED_HOSTS = ['press.pokemon.com'];
export const ALLOWED_PATH = 'src/data/set-legality.json';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const SET_ID_RE = /^[a-z0-9]+(pt\d+)?$/i;

class ValidationError extends Error {}

function fail(message) {
  throw new ValidationError(message);
}

function ensureObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be a JSON object`);
  }
}

function ensureValidSetId(setId) {
  if (!SET_ID_RE.test(setId)) {
    fail(`invalid setId: ${setId}`);
  }
}

function ensureNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${label} must be a non-empty string`);
  }
}

function ensureDashDate(value, label) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    fail(`${label} must be YYYY-MM-DD (dashes only): got ${JSON.stringify(value)}`);
  }
}

function ensureBoolean(value, label) {
  if (typeof value !== 'boolean') {
    fail(`${label} must be a boolean`);
  }
}

function ensureIsoTimestamp(value, label) {
  if (typeof value !== 'string' || !ISO_RE.test(value)) {
    fail(`${label} must be an ISO 8601 UTC timestamp`);
  }
}

function ensureAllowedHost(sourceUrl, label) {
  let host;
  try {
    host = new URL(sourceUrl).hostname;
  } catch {
    fail(`${label} is not a valid URL`);
  }
  if (!ALLOWED_HOSTS.includes(host)) {
    fail(`${label} host ${host} is not in the allow-list (${ALLOWED_HOSTS.join(', ')})`);
  }
}

function ensureLegalAfterRelease(entry, setId) {
  if (entry.legalFrom < entry.releaseDate) {
    fail(`${setId}: legalFrom (${entry.legalFrom}) precedes releaseDate (${entry.releaseDate})`);
  }
}

function ensureSourceUrl(entry, setId) {
  // Main sets are computed deterministically from the +14 day rule and
  // legitimately have no press release to cite — null sourceUrl is allowed.
  // Special sets must cite the press.pokemon.com release the ETB/Booster
  // Bundle date was extracted from.
  if (entry.isSpecialSet) {
    ensureNonEmptyString(entry.sourceUrl, `${setId}.sourceUrl`);
    ensureAllowedHost(entry.sourceUrl, `${setId}.sourceUrl`);
    return;
  }
  if (entry.sourceUrl === null) {
    return;
  }
  ensureNonEmptyString(entry.sourceUrl, `${setId}.sourceUrl`);
  ensureAllowedHost(entry.sourceUrl, `${setId}.sourceUrl`);
}

export function validateEntry(setId, entry) {
  ensureValidSetId(setId);
  ensureObject(entry, `${setId}: entry`);
  ensureNonEmptyString(entry.name, `${setId}.name`);
  ensureDashDate(entry.releaseDate, `${setId}.releaseDate`);
  ensureBoolean(entry.isSpecialSet, `${setId}.isSpecialSet`);
  ensureDashDate(entry.legalFrom, `${setId}.legalFrom`);
  ensureSourceUrl(entry, setId);
  ensureIsoTimestamp(entry.fetchedAt, `${setId}.fetchedAt`);
  ensureLegalAfterRelease(entry, setId);
}

export function validateLegalityFile(data) {
  ensureObject(data, 'set-legality.json root');
  for (const [setId, entry] of Object.entries(data)) {
    validateEntry(setId, entry);
  }
}

export function ensureNoDroppedEntries(previous, next) {
  for (const setId of Object.keys(previous)) {
    if (!(setId in next)) {
      fail(`refusing to drop existing entry: ${setId}`);
    }
  }
}

export function ensureOnlyAllowedPathChanged(changedPaths, allowedPath = ALLOWED_PATH) {
  const disallowed = changedPaths.filter((path) => path !== allowedPath);
  if (disallowed.length > 0) {
    fail(`agent modified disallowed paths: ${disallowed.join(', ')}`);
  }
}

function readCurrentLegalityFile() {
  if (!existsSync(targetPath)) {
    fail('set-legality.json missing after agent run');
  }
  return JSON.parse(readFileSync(targetPath, 'utf8'));
}

function readPreviousLegalityFile() {
  try {
    const previousJson = execSync('git show HEAD:src/data/set-legality.json', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    return JSON.parse(previousJson || '{}');
  } catch {
    return {};
  }
}

function readChangedPaths() {
  try {
    const diff = execSync('git diff --name-only HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    return diff ? diff.split('\n') : [];
  } catch {
    return [];
  }
}

function main() {
  try {
    const current = readCurrentLegalityFile();
    validateLegalityFile(current);

    const previous = readPreviousLegalityFile();
    ensureNoDroppedEntries(previous, current);

    const changed = readChangedPaths();
    if (changed.length > 0) {
      ensureOnlyAllowedPathChanged(changed);
    }

    console.log(`validate-legality: ok (${Object.keys(current).length} entries)`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(`validate-legality: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main();
}

export { ValidationError };
