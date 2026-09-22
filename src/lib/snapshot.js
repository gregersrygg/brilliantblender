import cardsData from '../data/cards.json';
import setsData from '../data/sets.json';
import { matchesBasicEnergyName } from './energy.js';
import { parseQuery, matchesQuery, hasQuery } from './card-query.js';

const DISABLED = import.meta.env.VITE_DISABLE_SNAPSHOT === 'true';

const ALT_ART_RARITIES = new Set([
  'Illustration Rare',
  'Special Illustration Rare',
  'Hyper Rare',
  'Rainbow Rare',
]);

let _setMap;

export function getSnapshotSetMap() {
  if (DISABLED) return new Map();
  if (!_setMap) _setMap = new Map(setsData);
  return _setMap;
}

export function getSnapshotCard(setId, number) {
  if (DISABLED) return null;
  return cardsData[`${setId}-${number}`] ?? null;
}

export function getSnapshotBasicEnergy(apiName) {
  if (DISABLED) return null;
  for (const card of Object.values(cardsData)) {
    if (card.set?.id === 'sve' && card.supertype === 'Energy' && matchesBasicEnergyName(card.name, apiName)) {
      return card;
    }
  }
  return null;
}

export function findSnapshotPrint(name, legalMarks) {
  if (DISABLED) return null;
  const candidates = Object.values(cardsData)
    .filter(p => {
      if (p.name !== name) return false;
      if (!legalMarks.includes(p.regulationMark)) return false;
      if (ALT_ART_RARITIES.has(p.rarity)) return false;
      const num = parseInt(p.number, 10);
      return !isNaN(num) && num <= (p.set?.printedTotal ?? 0);
    })
    .sort((a, b) => (b.set?.releaseDate ?? '').localeCompare(a.set?.releaseDate ?? ''));
  return candidates[0] ?? null;
}

export function getSnapshotPrintsByName(name) {
  if (DISABLED) return [];
  return Object.values(cardsData)
    .filter(p => p.name === name)
    .sort((a, b) => (a.set?.releaseDate ?? '').localeCompare(b.set?.releaseDate ?? ''));
}

function stripSymbols(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '');
}

export function searchSnapshot(query) {
  if (DISABLED) return [];
  if (!query || query.length < 2) return [];
  const normalizedQuery = stripSymbols(query.toLowerCase());
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const seen = new Set();
  const results = [];
  for (const card of Object.values(cardsData)) {
    if (seen.has(card.id)) continue;
    const normalizedName = stripSymbols(card.name.toLowerCase());
    if (terms.every(t => normalizedName.includes(t))) {
      seen.add(card.id);
      results.push(card);
      if (results.length >= 20) break;
    }
  }
  return results.sort((a, b) =>
    (b.set?.releaseDate ?? '').localeCompare(a.set?.releaseDate ?? '')
  );
}

/** Distinct set codes present in the snapshot, newest first — feeds `set:` autocomplete. */
export function getSnapshotSetCodes() {
  if (DISABLED) return [];
  const map = new Map();
  for (const card of Object.values(cardsData)) {
    const code = card.set?.ptcgoCode;
    if (!code || map.has(code)) continue;
    map.set(code, { code, name: card.set?.name ?? code, releaseDate: card.set?.releaseDate ?? '' });
  }
  return [...map.values()].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
}

const FILTER_LIMIT = 60;

/**
 * Filter the whole snapshot with the card-query language.
 * @param {string} query - the raw query string
 * @returns {{ cards: object[], total: number }} matches (capped) and the full match count
 */
export function filterSnapshot(query) {
  if (DISABLED) return { cards: [], total: 0 };
  const parsed = parseQuery(query);
  if (!hasQuery(parsed)) return { cards: [], total: 0 };

  const nameTerms = parsed.tokens
    .filter(t => t.kind === 'name' && t.valid)
    .map(t => stripSymbols(t.value.toLowerCase()));

  const matches = [];
  for (const card of Object.values(cardsData)) {
    if (matchesQuery(card, parsed)) matches.push(card);
  }

  // Newest-first, but float cards whose name starts with a typed name term.
  matches.sort((a, b) => {
    if (nameTerms.length) {
      const pa = nameTerms.some(t => stripSymbols(a.name.toLowerCase()).startsWith(t)) ? 0 : 1;
      const pb = nameTerms.some(t => stripSymbols(b.name.toLowerCase()).startsWith(t)) ? 0 : 1;
      if (pa !== pb) return pa - pb;
    }
    return (b.set?.releaseDate ?? '').localeCompare(a.set?.releaseDate ?? '');
  });

  return { cards: matches.slice(0, FILTER_LIMIT), total: matches.length };
}
