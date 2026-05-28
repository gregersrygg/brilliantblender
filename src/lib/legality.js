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
 * Returns the `legalFrom` date string when a set is not tournament-legal yet
 * (its legal date is strictly after `today`), otherwise `null`.
 * Date strings are YYYY-MM-DD, so lexicographic comparison is chronological.
 *
 * @param {{ legalFrom?: string } | null | undefined} entry - set-legality.json entry
 * @param {string} today - today's date as YYYY-MM-DD (see todayIso)
 * @returns {string|null}
 */
export function notLegalUntil(entry, today) {
  if (!entry || typeof entry.legalFrom !== 'string') return null;
  return entry.legalFrom > today ? entry.legalFrom : null;
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
