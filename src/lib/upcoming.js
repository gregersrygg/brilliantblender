// Pure helpers for announced-but-unreleased sets (src/data/upcoming-sets.json).
//
// Like legality.js, this module is kept free of data/JSON imports so it runs under
// `node --test`: every function takes the set data as an argument. The JSON import and
// wiring live in the consumers (UpcomingSets.svelte, deck.svelte.js).
//
// An upcoming-sets entry looks like:
//   { setCode|null, name, series, releaseDate, prereleaseDate|null, isSpecialSet, ... }
// Entries are normally dropped from the file once their releaseDate has passed, so an
// entry is usually "announced" (before prerelease) or "prerelease" (in the window). The
// pipeline only prunes on its next run, though, so a just-released set can briefly
// linger — hence the "released" state below.

import { addDaysIso } from './legality.js';

// Per Handbook §4.1.2 a new card is tournament-legal ~2 weeks (14 days) after release.
const DAYS_UNTIL_LEGAL = 14;

/**
 * The date an upcoming set becomes tournament-legal to play, or `null` when unknown.
 *
 * Main sets are legal `releaseDate + 14`. Special sets have no fixed offset (the date
 * is tied to an ETB / Booster-Bundle release only announced at/after launch), so we
 * return `null` ("unknown") until the update-set-legality workflow fills it in. If the
 * entry already carries an explicit `legalFrom` (e.g. a hand-backfilled special date),
 * that wins.
 *
 * @param {{ releaseDate?: string, isSpecialSet?: boolean, legalFrom?: string }} entry
 * @returns {string|null} YYYY-MM-DD, or null when not yet known
 */
export function legalToPlayDate(entry) {
  if (!entry) return null;
  if (typeof entry.legalFrom === 'string') return entry.legalFrom;
  if (entry.isSpecialSet) return null;
  if (typeof entry.releaseDate !== 'string') return null;
  return addDaysIso(entry.releaseDate, DAYS_UNTIL_LEGAL);
}

/**
 * Lifecycle status of an upcoming set relative to `today` (YYYY-MM-DD):
 * - `'released'`   — the set has reached its release date (today ≥ releaseDate)
 * - `'prerelease'` — the prerelease window has opened but the set hasn't released yet
 * - `'announced'`  — before any of the above
 *
 * @param {{ prereleaseDate?: string|null, releaseDate?: string }} entry
 * @param {string} today - YYYY-MM-DD (see todayIso)
 * @returns {'announced'|'prerelease'|'released'}
 */
export function upcomingStatus(entry, today) {
  if (!entry || typeof entry.releaseDate !== 'string') return 'announced';
  if (today >= entry.releaseDate) return 'released';
  if (typeof entry.prereleaseDate === 'string' && entry.prereleaseDate <= today) return 'prerelease';
  return 'announced';
}

/**
 * Returns the upcoming sets sorted by release date (soonest first). Does not mutate.
 * @param {Array} sets
 * @returns {Array}
 */
export function sortByReleaseDate(sets) {
  return [...(sets ?? [])].sort((a, b) =>
    (a.releaseDate ?? '').localeCompare(b.releaseDate ?? '')
  );
}

/**
 * Finds an upcoming set by its printed set code (case-insensitive), or `null`.
 * Used to recognise a pasted deck line from a not-yet-released set.
 * @param {Array} sets
 * @param {string} setCode
 * @returns {object|null}
 */
export function findSetByCode(sets, setCode) {
  if (!setCode) return null;
  const code = setCode.toUpperCase();
  return (sets ?? []).find(s => (s.setCode ?? '').toUpperCase() === code) ?? null;
}
