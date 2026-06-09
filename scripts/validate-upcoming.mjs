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

// setId is null until the set releases (no API ID exists pre-release); once
// backfilled it must look like a real API set ID (e.g. "me5", "sv8pt5").
function ensureSetIdOrNull(value, label) {
  if (value === null) return;
  if (typeof value !== 'string' || !SET_ID_RE.test(value)) {
    fail(`${label} must be null or a valid set ID: got ${JSON.stringify(value)}`);
  }
}

// A prerelease, when present, can never fall after the tabletop release.
function ensurePrereleaseBeforeRelease(entry, label) {
  if (entry.prereleaseDate === null) return;
  if (entry.prereleaseDate > entry.releaseDate) {
    fail(`${label}: prereleaseDate (${entry.prereleaseDate}) is after releaseDate (${entry.releaseDate})`);
  }
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
  ensureSetIdOrNull(entry.setId, `${label}.setId`);
  ensureNonEmptyString(entry.name, `${label}.name`);
  ensureNonEmptyString(entry.series, `${label}.series`);
  ensureDashDate(entry.releaseDate, `${label}.releaseDate`);
  // prereleaseDate is null for special sets / announcements without a Prerelease.
  if (entry.prereleaseDate !== null) {
    ensureDashDate(entry.prereleaseDate, `${label}.prereleaseDate`);
  }
  ensureBoolean(entry.isSpecialSet, `${label}.isSpecialSet`);
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

// Use porcelain status (not `git diff --name-only`, which omits untracked files)
// so a freshly-created upcoming-sets.json — untracked on the very first run,
// before the file exists on main — is still seen by the path guard.
function readChangedPaths() {
  try {
    const out = execSync('git status --porcelain --untracked-files=all', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    if (!out) return [];
    return out.split('\n').map((line) => line.slice(3).trim()).filter(Boolean);
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
