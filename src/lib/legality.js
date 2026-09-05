// Pure helpers for tournament set-legality dates.
//
// Sets become tournament-legal ~2 weeks after release, but the API marks a card
// Standard-legal the moment it's printed. set-legality.json records the real
// `legalFrom` date per set; these helpers turn that into a "not legal yet" notice.
//
// Kept free of data/JSON imports so it runs under `node --test` — the static
// set-legality.json import and wiring live in deck.svelte.js.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Returns the date string when a card from this set becomes legal to play, if that
 * date is still in the future relative to `today`; otherwise `null` (already legal).
 * Date strings are YYYY-MM-DD, so lexicographic comparison is chronological.
 *
 * Per Handbook §4.1.2 a new card is legal from the set's `legalFrom` (≈2 weeks after
 * release). Per §4.1.3 a *reprint* of an already-playable card is legal from the set's
 * `releaseDate` instead — pass `{ isReprint: true }` to use that earlier date.
 *
 * @param {{ legalFrom?: string, releaseDate?: string } | null | undefined} entry
 * @param {string} today - today's date as YYYY-MM-DD (see todayIso)
 * @param {{ isReprint?: boolean }} [opts]
 * @returns {string|null}
 */
export function notLegalUntil(entry, today, { isReprint = false } = {}) {
  if (!entry) return null;
  const date = isReprint ? entry.releaseDate : entry.legalFrom;
  if (typeof date !== 'string') return null;
  return date > today ? date : null;
}

/**
 * Is a set already tournament-legal on `today`? Untracked sets (no entry) are
 * established and treated as legal; tracked sets are legal from their `legalFrom`.
 * Used to decide whether another print can anchor the §4.1.3 reprint rule.
 *
 * @param {{ legalFrom?: string } | null | undefined} entry
 * @param {string} today - today's date as YYYY-MM-DD
 * @returns {boolean}
 */
export function isSetLegalOn(entry, today) {
  if (!entry || typeof entry.legalFrom !== 'string') return true;
  return entry.legalFrom <= today;
}

/**
 * Today's local calendar date as YYYY-MM-DD (zero-padded).
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function todayIso(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds `n` days to a YYYY-MM-DD date string, returning a YYYY-MM-DD string.
 * Done in UTC (no local-timezone offset) so it's deterministic — same result on the
 * build-time prerender server and in any client timezone, which keeps the prerendered
 * landing free of hydration mismatches. Returns the input unchanged if it isn't ISO.
 *
 * Used to derive an upcoming main set's tournament-legal date (releaseDate + 14, per
 * Handbook §4.1.2) before it has a set-legality.json entry.
 * @param {string} iso
 * @param {number} n - days to add (may be negative)
 * @returns {string}
 */
export function addDaysIso(iso, n) {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) return iso;
  const [, year, month, day] = m;
  const ms = Date.UTC(Number(year), Number(month) - 1, Number(day)) + n * 86400000;
  const d = new Date(ms);
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Snaps a YYYY-MM-DD date forward to the next Friday, returning the date unchanged if it
 * is already a Friday. Done in UTC (see addDaysIso) so it's timezone-deterministic.
 * Returns the input unchanged if it isn't an ISO date.
 *
 * Play! Pokémon's tournament calendar runs on Fridays — new cards go legal on a Friday so
 * the weekend Championship-Series card pool is stable. Main sets release on Fridays, so
 * their `releaseDate + 14` already lands on one; special sets are anchored to an ETB /
 * Booster-Bundle date that can fall mid-week (e.g. 30th Celebration's global launch on a
 * Wednesday), so we snap the computed date forward to the following Friday.
 * @param {string} iso
 * @returns {string}
 */
export function snapToFridayIso(iso) {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) return iso;
  const [, year, month, day] = m;
  const dow = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay();
  const daysToFriday = (5 - dow + 7) % 7; // 5 = Friday; 0 when already Friday
  return addDaysIso(iso, daysToFriday);
}

/**
 * Special-set legal date: the second Friday following the ETB/Booster-Bundle anchor (§4.1.2.1).
 * @param {string} anchorIso - YYYY-MM-DD ETB/Booster-Bundle date
 * @returns {string} YYYY-MM-DD
 */
export function legalDateFromAnchor(anchorIso) {
  // anchor+1 so a Friday anchor rolls forward to the *next* Friday, then +7 for the second.
  return addDaysIso(snapToFridayIso(addDaysIso(anchorIso, 1)), 7);
}

/**
 * Formats a YYYY-MM-DD string as a readable date, e.g. "2026-06-05" -> "Jun 5, 2026".
 * Done from the string parts (no Date) to stay free of timezone/locale variance.
 * Returns the input unchanged if it isn't an ISO date.
 * @param {string} iso
 * @returns {string}
 */
export function formatLegalDate(iso) {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) return iso;
  const [, year, month, day] = m;
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}
