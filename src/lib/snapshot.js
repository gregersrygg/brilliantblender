import cardsData from '../data/cards.json';
import setsData from '../data/sets.json';

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
    if (card.name === apiName && card.set?.id === 'sve' && card.supertype === 'Energy') {
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
  return str.replace(/[^a-z0-9 ]/g, '');
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
