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

const meta = {};
for (const card of Object.values(cards)) {
  if (!card.set?.id || meta[card.set.id]) continue;
  meta[card.set.id] = {
    setId: card.set.id,
    ptcgoCode: card.set.ptcgoCode ?? null,
    name: card.set.name,
    releaseDate: card.set.releaseDate,
  };
}

const result = newIds.map((id) => meta[id]).filter(Boolean);
process.stdout.write(JSON.stringify(result));
