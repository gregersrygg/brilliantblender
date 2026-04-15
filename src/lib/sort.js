const POKEMON_TYPE_ORDER = [
  'Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting',
  'Darkness', 'Metal', 'Fairy', 'Dragon', 'Colorless',
];

const TRAINER_SUBTYPE_ORDER = ['Item', 'Supporter', 'Pokémon Tool', 'Stadium'];

const POKEMON_STAGE_ORDER = { 'Basic': 0, 'Stage 1': 1, 'Stage 2': 2 };

function typeIndex(type) {
  const i = POKEMON_TYPE_ORDER.indexOf(type);
  return i === -1 ? Infinity : i;
}

function trainerSubtypeIndex(subtypes) {
  if (!subtypes) return Infinity;
  let best = Infinity;
  for (const s of subtypes) {
    const i = TRAINER_SUBTYPE_ORDER.indexOf(s);
    if (i !== -1 && i < best) best = i;
  }
  return best;
}

function pokemonStageIndex(subtypes) {
  if (!subtypes) return 99;
  for (const s of subtypes) {
    if (s in POKEMON_STAGE_ORDER) return POKEMON_STAGE_ORDER[s];
  }
  // Evolution-like forms (VMAX, VSTAR, BREAK, Mega, etc.) sit above Stage 2.
  return 3;
}

function numericPart(n) {
  const parsed = parseInt(n, 10);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

/**
 * Compute the evolution-chain root name for each Pokémon card in a section.
 * Walks `evolvesFrom` through other cards in the same section; falls back to
 * the card's own name (for Basics) or the out-of-deck parent name (for
 * Rare-Candy-style lines where the Stage 1 isn't in the deck).
 */
function buildRootNameMap(cards) {
  const byName = new Map();
  for (const c of cards) {
    if (c.name && !byName.has(c.name)) byName.set(c.name, c);
  }
  const cache = new Map();
  function rootOf(card, seen) {
    if (!card.evolvesFrom) return card.name;
    if (cache.has(card.name)) return cache.get(card.name);
    if (seen.has(card.name)) return card.name;
    seen.add(card.name);
    const parent = byName.get(card.evolvesFrom);
    const root = parent ? rootOf(parent, seen) : card.evolvesFrom;
    cache.set(card.name, root);
    return root;
  }
  const out = new Map();
  for (const c of cards) out.set(c, rootOf(c, new Set()));
  return out;
}

function makePokemonComparator(rootNames) {
  return (a, b) => {
    const ta = typeIndex(a.types?.[0]);
    const tb = typeIndex(b.types?.[0]);
    if (ta !== tb) return ta - tb;
    const ra = rootNames.get(a) ?? a.name;
    const rb = rootNames.get(b) ?? b.name;
    if (ra !== rb) return ra.localeCompare(rb);
    const sa = pokemonStageIndex(a.subtypes);
    const sb = pokemonStageIndex(b.subtypes);
    if (sa !== sb) return sa - sb;
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    const sida = a.setId ?? '\uffff';
    const sidb = b.setId ?? '\uffff';
    if (sida !== sidb) return sida < sidb ? -1 : 1;
    return numericPart(a.number) - numericPart(b.number);
  };
}

function compareTrainer(a, b) {
  const sa = trainerSubtypeIndex(a.subtypes);
  const sb = trainerSubtypeIndex(b.subtypes);
  if (sa !== sb) return sa - sb;
  return a.name.localeCompare(b.name);
}

function compareEnergy(a, b) {
  const ba = a.isBasicEnergy ? 1 : 0;
  const bb = b.isBasicEnergy ? 1 : 0;
  if (ba !== bb) return ba - bb;
  return a.name.localeCompare(b.name);
}

/**
 * Sort each section of the deck in place.
 * Error cards are appended at the end of their section in insertion order.
 * Still-loading cards participate in the sort using whatever fields are
 * already populated (at minimum, `name`) so the list is alpha-stable during
 * loading and snaps to full order as API data arrives.
 */
export function sortDeck(deck) {
  if (!deck?.sections) return;
  for (const section of deck.sections) {
    const sortable = [];
    const errored = [];
    for (const card of section.cards) {
      (card.cardError ? errored : sortable).push(card);
    }
    if (section.name === 'Pokémon') {
      const roots = buildRootNameMap(sortable);
      sortable.sort(makePokemonComparator(roots));
    } else if (section.name === 'Trainer') {
      sortable.sort(compareTrainer);
    } else if (section.name === 'Energy') {
      sortable.sort(compareEnergy);
    } else {
      continue;
    }
    section.cards = [...sortable, ...errored];
  }
}
