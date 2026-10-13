// Fills promo sets that pokemon-tcg-data lacks or lags behind on, using TCGdex.
// See docs/architecture.md "Promo supplement (TCGdex)".

const SCRYDEX = 'https://images.scrydex.com/pokemon';

export const SUPPLEMENT_SETS = [
  { dir: 'data/Scarlet & Violet/SVP Black Star Promos', setId: 'svp' },
  { dir: 'data/Mega Evolution/MEP Black Star Promos', setId: 'mep', ptcgoCode: 'MEP', name: 'Mega Evolution Black Star Promos' },
];

const STAGES = { Basic: 'Basic', Stage1: 'Stage 1', Stage2: 'Stage 2' };
const SUPERTYPES = { Pokemon: 'Pokémon', Trainer: 'Trainer', Energy: 'Energy' };

const signature = c => JSON.stringify([
  c.hp == null ? null : String(c.hp),
  (c.attacks ?? []).map(a => a.name),
  (c.abilities ?? []).map(a => a.name),
]);

// Upstream card with the same name and gameplay shape, whose fields we borrow verbatim.
export function findTwin(tc, byName) {
  const supertype = SUPERTYPES[tc.category];
  const candidates = (byName.get(tc.name) ?? []).filter(c => c.supertype === supertype);
  if (supertype !== 'Pokémon') return candidates[0] ?? null;
  const sig = signature(tc);
  return candidates.find(c => signature(c) === sig) ?? null;
}

function deriveSubtypes(tc) {
  if (tc.category === 'Pokemon') {
    const out = [STAGES[tc.stage] ?? tc.stage].filter(Boolean);
    if (tc.suffix === 'ex' && tc.name.startsWith('Mega ')) out.push('MEGA');
    if (tc.suffix === 'ex') out.push('ex');
    return out;
  }
  if (tc.category === 'Trainer') return [tc.trainerType === 'Tool' ? 'Pokémon Tool' : tc.trainerType].filter(Boolean);
  return [tc.energyType === 'Normal' ? 'Basic' : tc.energyType].filter(Boolean);
}

function deriveRules(tc, subtypes) {
  if (tc.category !== 'Pokemon') return tc.effect ? [tc.effect] : [];
  if (subtypes.includes('MEGA')) return ['Mega Evolution ex Rule: When your Mega Evolution Pokémon ex is Knocked Out, your opponent takes 3 Prize cards.'];
  if (subtypes.includes('ex')) return ['Pokémon ex rule: When your Pokémon ex is Knocked Out, your opponent takes 2 Prize cards.'];
  return [];
}

const mapWeakness = w => ({ type: w.type, value: String(w.value ?? '').replace(/^x/, '×') });

// Callers only pass cards with a Standard regulation mark; promos are all Expanded-legal.
export function tcgdexToCard(tc, set, twin) {
  const number = String(parseInt(tc.localId, 10));
  const subtypes = deriveSubtypes(tc);
  const gameplay = twin
    ? {
        supertype: twin.supertype, subtypes: twin.subtypes, hp: twin.hp, types: twin.types,
        weaknesses: twin.weaknesses, resistances: twin.resistances,
        convertedRetreatCost: twin.convertedRetreatCost, attacks: twin.attacks,
        abilities: twin.abilities, evolvesFrom: twin.evolvesFrom, rules: twin.rules,
      }
    : {
        supertype: SUPERTYPES[tc.category],
        subtypes,
        hp: tc.hp == null ? null : String(tc.hp),
        types: tc.types ?? [],
        weaknesses: (tc.weaknesses ?? []).map(mapWeakness),
        resistances: (tc.resistances ?? []).map(mapWeakness),
        convertedRetreatCost: tc.retreat ?? 0,
        attacks: (tc.attacks ?? []).map(a => ({
          name: a.name,
          cost: a.cost ?? [],
          convertedEnergyCost: (a.cost ?? []).length,
          damage: a.damage == null ? '' : String(a.damage),
          text: a.effect ?? '',
        })),
        abilities: (tc.abilities ?? []).map(a => ({ name: a.name, text: a.effect ?? '', type: a.type })),
        evolvesFrom: tc.evolveFrom ?? null,
        rules: deriveRules(tc, subtypes),
      };
  const image = `${SCRYDEX}/${set.id}-${number}`;
  return {
    id: `${set.id}-${number}`,
    name: tc.name,
    number,
    ...gameplay,
    regulationMark: tc.regulationMark ?? null,
    rarity: tc.rarity ?? null,
    legalities: { standard: 'Legal', expanded: 'Legal' },
    set,
    images: { small: `${image}/small`, large: `${image}/large` },
  };
}

// Picks the English string out of TCGdex's per-language objects ({ en, fr, de, … }).
export function localize(value) {
  if (Array.isArray(value)) return value.map(localize);
  if (value && typeof value === 'object') {
    if (typeof value.en === 'string') return value.en;
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localize(v)]));
  }
  return value;
}

// `exported` is export-tcgdex.mjs output (untrusted data); returns cards missing upstream plus
// [ptcgoCode, setId] entries for sets upstream doesn't know.
export function buildSupplement({ exported, cardsById, setsById, byName, legalMarks }) {
  const cards = [];
  const codes = [];
  for (const def of SUPPLEMENT_SETS) {
    const entry = exported.find(e => e.setId === def.setId);
    if (!entry) throw new Error(`export has no ${def.setId} set`);
    const upstream = setsById[def.setId];
    const set = {
      id: def.setId,
      ptcgoCode: upstream?.ptcgoCode ?? def.ptcgoCode,
      name: upstream?.name ?? def.name,
      releaseDate: upstream?.releaseDate ?? String(entry.releaseDate).replaceAll('-', '/'),
      printedTotal: upstream?.printedTotal ?? entry.cards.length,
    };
    let added = 0;
    for (const tc of entry.cards) {
      if (cardsById[`${def.setId}-${parseInt(tc.localId, 10)}`]) continue;
      if (!legalMarks.includes(tc.regulationMark)) continue;
      cards.push(tcgdexToCard(tc, set, findTwin(tc, byName)));
      added++;
    }
    if (added && !upstream) codes.push([set.ptcgoCode, set.id]);
    console.log(`  ${def.setId}: ${added} cards from TCGdex`);
  }
  return { cards, codes };
}
