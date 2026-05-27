#!/usr/bin/env node
// Usage: node scripts/detect-new-sets.mjs <prev-sets.json> <curr-sets.json> <cards.json>
// Emits JSON array of sets present in curr but not in prev, enriched with name+releaseDate from cards.

import { readFileSync } from 'fs';

const [, , prevPath, currPath, cardsPath] = process.argv;
if (!prevPath || !currPath || !cardsPath) {
  console.error('usage: detect-new-sets.mjs <prev-sets.json> <curr-sets.json> <cards.json>');
  process.exit(2);
}

const prev = JSON.parse(readFileSync(prevPath, 'utf8'));
const curr = JSON.parse(readFileSync(currPath, 'utf8'));
const cards = JSON.parse(readFileSync(cardsPath, 'utf8'));

const prevIds = new Set(prev.map(([, id]) => id));
const newIds = curr.map(([, id]) => id).filter((id) => !prevIds.has(id));

function normalizeDate(raw) {
  if (typeof raw !== 'string') return raw;
  return raw.replaceAll('/', '-');
}

// The TCG API's set ID convention uses a `pt<N>` suffix for sub-set / special
// releases (e.g. me2pt5 = Ascended Heroes, sv3pt5 = Pokemon 151, sv4pt5 =
// Paldean Fates, sv8pt5 = Prismatic Evolutions, swsh12pt5 = Crown Zenith).
// Bare-numbered IDs (me4, sv6, swsh8) are full main-set releases with booster
// boxes and sleeved booster packs. This is more reliable than scraping press
// releases, where individual articles (especially MEDIA-ALERTs) often omit
// product SKUs even for sets that ship with them.
function isSpecialSet(setId) {
  return /pt\d+$/i.test(setId);
}

const meta = {};
for (const card of Object.values(cards)) {
  if (!card.set?.id || meta[card.set.id]) continue;
  meta[card.set.id] = {
    setId: card.set.id,
    ptcgoCode: card.set.ptcgoCode ?? null,
    name: card.set.name,
    releaseDate: normalizeDate(card.set.releaseDate),
    isSpecialSet: isSpecialSet(card.set.id),
  };
}

const result = newIds.map((id) => meta[id]).filter(Boolean);
process.stdout.write(JSON.stringify(result));
