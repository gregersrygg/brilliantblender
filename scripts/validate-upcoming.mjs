#!/usr/bin/env node
// Post-step guard for the upcoming-sets agent. Reads the current
// src/data/upcoming-sets.json and refuses to let bad data reach main.
//
// Mirrors validate-legality.mjs (same strict, one-check-per-function style), but
// the shape differs: upcoming-sets.json is an ARRAY keyed by nothing (no API setId
// exists before a set releases), and — unlike set-legality.json — entries are MEANT
// to disappear once a set ships, so there is deliberately no "no dropped entries"
// guard here.

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const targetPath = resolve(repoRoot, 'src/data/upcoming-sets.json');

export const ALLOWED_HOSTS = ['press.pokemon.com'];
export const ALLOWED_PATH = 'src/data/upcoming-sets.json';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
// The set code printed on the card (e.g. "CRI", "SSP", "BS", "B2") — short uppercase
// alphanumeric. Matches the deck card's `setCode` elsewhere in the app and the first
// element of the sets.json [ptcgoCode, setId] tuples (the API's `set.ptcgoCode`),
// not the pokemontcg.io API set ID.
const SET_CODE_RE = /^[A-Z0-9]{2,5}$/;

class ValidationError extends Error {}

function fail(message) {
  throw new ValidationError(message);
}

function ensureObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be a JSON object`);
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
  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    fail(`${label} is not a valid URL`);
  }
  // Provenance link must be HTTPS — reject http:// and other schemes.
  if (url.protocol !== 'https:') {
    fail(`${label} must use https (got ${url.protocol})`);
  }
  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    fail(`${label} host ${url.hostname} is not in the allow-list (${ALLOWED_HOSTS.join(', ')})`);
  }
}

// setCode is null until the set's code is known (it isn't in the press release);
// once backfilled it must look like a real set code (e.g. "CRI").
function ensureSetCodeOrNull(value, label) {
  if (value === null) return;
  if (typeof value !== 'string' || !SET_CODE_RE.test(value)) {
    fail(`${label} must be null or a valid set code: got ${JSON.stringify(value)}`);
  }
}

// A prerelease, when present, can never fall after the tabletop release.
function ensurePrereleaseBeforeRelease(entry, label) {
  if (entry.prereleaseDate === null) return;
  if (entry.prereleaseDate > entry.releaseDate) {
    fail(`${label}: prereleaseDate (${entry.prereleaseDate}) is after releaseDate (${entry.releaseDate})`);
  }
}

// legalProductDate is the ETB/Booster-Bundle anchor for a special set's legal date. It's
// null until scraped, and only meaningful for special sets — main sets derive their legal
// date from releaseDate, so theirs must stay null. When present it can't precede release.
function ensureLegalProductDate(entry, label) {
  const value = entry.legalProductDate;
  if (value === null) return;
  if (!entry.isSpecialSet) {
    fail(`${label}.legalProductDate must be null for a main set: got ${JSON.stringify(value)}`);
  }
  ensureDashDate(value, `${label}.legalProductDate`);
}

// isSpecialSet is *defined* by Prerelease presence (see the workflow prompt): main
// sets have a Prerelease (prereleaseDate set), special sets do not (prereleaseDate
// null). Reject contradictory combinations so we never write self-inconsistent data.
function ensureSpecialMatchesPrerelease(entry, label) {
  const hasPrerelease = entry.prereleaseDate !== null;
  if (entry.isSpecialSet === hasPrerelease) {
    fail(
      `${label}: isSpecialSet (${entry.isSpecialSet}) is inconsistent with prereleaseDate ` +
      `(${JSON.stringify(entry.prereleaseDate)}) — special sets have no Prerelease, main sets have one`,
    );
  }
}

export function validateEntry(label, entry) {
  ensureObject(entry, `${label}: entry`);
  ensureSetCodeOrNull(entry.setCode, `${label}.setCode`);
  ensureNonEmptyString(entry.name, `${label}.name`);
  ensureNonEmptyString(entry.series, `${label}.series`);
  ensureDashDate(entry.releaseDate, `${label}.releaseDate`);
  // prereleaseDate is null for special sets / announcements without a Prerelease.
  if (entry.prereleaseDate !== null) {
    ensureDashDate(entry.prereleaseDate, `${label}.prereleaseDate`);
  }
  ensureBoolean(entry.isSpecialSet, `${label}.isSpecialSet`);
  ensureLegalProductDate(entry, label);
  ensureNonEmptyString(entry.sourceUrl, `${label}.sourceUrl`);
  ensureAllowedHost(entry.sourceUrl, `${label}.sourceUrl`);
  ensureIsoTimestamp(entry.fetchedAt, `${label}.fetchedAt`);
  ensurePrereleaseBeforeRelease(entry, label);
  ensureSpecialMatchesPrerelease(entry, label);
}

export function validateUpcomingFile(data) {
  if (!Array.isArray(data)) {
    fail('upcoming-sets.json root must be a JSON array');
  }
  data.forEach((entry, i) => validateEntry(`upcoming[${i}]`, entry));
}

export function ensureOnlyAllowedPathChanged(changedPaths, allowedPath = ALLOWED_PATH) {
  const disallowed = changedPaths.filter((path) => path !== allowedPath);
  if (disallowed.length > 0) {
    fail(`agent modified disallowed paths: ${disallowed.join(', ')}`);
  }
}

function readCurrentUpcomingFile() {
  if (!existsSync(targetPath)) {
    fail('upcoming-sets.json missing after agent run');
  }
  return JSON.parse(readFileSync(targetPath, 'utf8'));
}

// `git status --porcelain` lines are a fixed-width two-column status field plus a
// space, then the path: "M  path" (staged), " M path" (unstaged — LEADING SPACE),
// "?? path" (untracked). The leading space is significant, so the raw output must
// NOT be trimmed as a whole: doing so eats the first status column of an unstaged
// line and shifts its path one character left (" M src/..." -> "rc/..."), which
// then fails the allow-list comparison for a file the agent was allowed to touch.
// Trim per path, never across the output. This broke the Sep 2026 run — the agent
// edits upcoming-sets.json in place (unstaged), the only state with a leading space.
export function parsePorcelainPaths(out) {
  return out
    .split('\n')
    .filter((line) => line.length > 3)
    .map((line) => {
      const path = line.slice(3).trim();
      // Renames and copies read "R  old -> new"; the destination is what changed.
      const arrow = path.indexOf(' -> ');
      return arrow === -1 ? path : path.slice(arrow + 4);
    })
    .filter(Boolean);
}

// Use porcelain status (not `git diff --name-only`, which omits untracked files)
// so a freshly-created upcoming-sets.json — untracked on the very first run,
// before the file exists on main — is still seen by the path guard.
function readChangedPaths() {
  try {
    const out = execSync('git status --porcelain --untracked-files=all', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    return parsePorcelainPaths(out);
  } catch {
    return [];
  }
}

function main() {
  try {
    const current = readCurrentUpcomingFile();
    validateUpcomingFile(current);

    const changed = readChangedPaths();
    if (changed.length > 0) {
      ensureOnlyAllowedPathChanged(changed);
    }

    console.log(`validate-upcoming: ok (${current.length} entries)`);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(`validate-upcoming: ${error.message}`);
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
