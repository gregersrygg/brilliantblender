// Fills promo sets that pokemon-tcg-data lacks or lags behind on, using TCGdex.
// See docs/architecture.md "Promo supplement (TCGdex)".

import { createHash } from 'crypto';

const TCGDEX_API = 'https://api.tcgdex.net/v2/en';
const SCRYDEX = 'https://images.scrydex.com/pokemon';

export const SUPPLEMENT_SETS = [
  { tcgdexId: 'svp', setId: 'svp' },
  { tcgdexId: 'mep', setId: 'mep', ptcgoCode: 'MEP', name: 'Mega Evolution Black Star Promos' },
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

export function tcgdexToCard(tc, set, images, twin) {
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
  return {
    id: `${set.id}-${number}`,
    name: tc.name,
    number,
    ...gameplay,
    regulationMark: tc.regulationMark ?? null,
    rarity: tc.rarity ?? null,
    legalities: {
      ...(tc.legal?.standard ? { standard: 'Legal' } : {}),
      ...(tc.legal?.expanded ? { expanded: 'Legal' } : {}),
    },
    set,
    images: images ?? { small: null, large: null },
  };
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function sha1Of(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return createHash('sha1').update(Buffer.from(await res.arrayBuffer())).digest('hex');
}

// TCGdex assets first; scrydex (pokemontcg.io's own host) answers unknown ids with a
// card-back placeholder, so its image only counts when it differs from that placeholder.
async function findImages(tc, def, serie, scrydexPlaceholder) {
  const tcgdex = tc.image ?? `https://assets.tcgdex.net/en/${serie}/${def.tcgdexId}/${tc.localId}`;
  const head = await fetch(`${tcgdex}/low.webp`, { method: 'HEAD' });
  if (head.ok) return { small: `${tcgdex}/low.webp`, large: `${tcgdex}/high.webp` };
  const scrydex = `${SCRYDEX}/${def.setId}-${parseInt(tc.localId, 10)}`;
  const hash = await sha1Of(`${scrydex}/small`);
  if (hash && hash !== scrydexPlaceholder) return { small: `${scrydex}/small`, large: `${scrydex}/large` };
  return null;
}

async function mapLimit(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }));
  return out;
}

// Returns { cards: [...trimmed cards], codes: [[ptcgoCode, setId], ...] } for cards missing upstream.
export async function fetchSupplement({ cardsById, setsById, byName, legalMarks }) {
  const cards = [];
  const codes = [];
  const scrydexPlaceholder = await sha1Of(`${SCRYDEX}/none-0/small`);
  for (const def of SUPPLEMENT_SETS) {
    const tset = await getJson(`${TCGDEX_API}/sets/${def.tcgdexId}`);
    const upstream = setsById[def.setId];
    const missing = tset.cards.filter(c => {
      const n = parseInt(c.localId, 10);
      return !isNaN(n) && !cardsById[`${def.setId}-${n}`];
    });
    const set = {
      id: def.setId,
      ptcgoCode: upstream?.ptcgoCode ?? def.ptcgoCode,
      name: upstream?.name ?? def.name,
      releaseDate: upstream?.releaseDate ?? tset.releaseDate.replaceAll('-', '/'),
      printedTotal: upstream?.printedTotal ?? tset.cardCount.total,
    };
    const fetched = await mapLimit(missing, 8, async brief => {
      const tc = await getJson(`${TCGDEX_API}/cards/${brief.id}`);
      if (!legalMarks.includes(tc.regulationMark)) return null;
      const images = await findImages(tc, def, tset.serie.id, scrydexPlaceholder);
      return tcgdexToCard(tc, set, images, findTwin(tc, byName));
    });
    const added = fetched.filter(Boolean);
    cards.push(...added);
    if (added.length && !upstream) codes.push([set.ptcgoCode, set.id]);
    console.log(`  ${def.tcgdexId}: ${added.length} cards from TCGdex`);
  }
  return { cards, codes };
}
