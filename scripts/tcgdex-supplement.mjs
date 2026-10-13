// Fills promo sets that pokemon-tcg-data lacks or lags behind on, using TCGdex.
// See docs/architecture.md "Promo supplement (TCGdex)".

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const REPO_URL = 'https://github.com/tcgdex/cards-database.git';
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

const LITERALS = { true: true, false: false, null: null, undefined: null };

// cards-database files are TS modules whose body is a plain object literal. Parse that literal as
// data (strings incl. "a" + "b", numbers, objects, arrays) rather than executing third-party
// code; other bare identifiers (the `set: Set` import) become null.
export function parseTcgdexModule(src) {
  const decl = /^const \w+: \w+ = /m.exec(src);
  if (!decl) throw new Error('no object literal found');
  let i = decl.index + decl[0].length;

  const ws = () => { while (/\s/.test(src[i])) i++; };
  const expect = ch => {
    ws();
    if (src[i] !== ch) throw new Error(`expected "${ch}" at ${i}, got "${src[i]}"`);
    i++;
  };
  const string = () => {
    const quote = src[i++];
    let out = '';
    while (src[i] !== quote) {
      if (i >= src.length) throw new Error('unterminated string');
      if (src[i] === '\\') {
        const esc = src[++i];
        out += { n: '\n', t: '\t', r: '\r' }[esc] ?? esc;
      } else {
        out += src[i];
      }
      i++;
    }
    i++;
    return out;
  };
  const word = () => {
    const m = /^[\w$-]+/.exec(src.slice(i));
    if (!m) throw new Error(`unexpected "${src[i]}" at ${i}`);
    i += m[0].length;
    return m[0];
  };
  const value = () => {
    ws();
    const ch = src[i];
    if (ch === '{') {
      i++;
      const obj = {};
      for (ws(); src[i] !== '}'; ws()) {
        const key = src[i] === '"' || src[i] === "'" ? string() : word();
        expect(':');
        obj[key] = value();
        ws();
        if (src[i] === ',') i++;
      }
      i++;
      return obj;
    }
    if (ch === '[') {
      i++;
      const arr = [];
      for (ws(); src[i] !== ']'; ws()) {
        arr.push(value());
        ws();
        if (src[i] === ',') i++;
      }
      i++;
      return arr;
    }
    if (ch === '"' || ch === "'") {
      let out = string();
      for (ws(); src[i] === '+'; ws()) {
        i++;
        ws();
        if (src[i] !== '"' && src[i] !== "'") throw new Error(`expected string after "+" at ${i}`);
        out += string();
      }
      return out;
    }
    const w = word();
    if (/^-?\d/.test(w)) return Number(w);
    return w in LITERALS ? LITERALS[w] : null;
  };
  return localize(value());
}

// Returns { cards: [...trimmed cards], codes: [[ptcgoCode, setId], ...] } for cards missing upstream.
export function loadSupplement({ tmp, cardsById, setsById, byName, legalMarks }) {
  console.log('Cloning tcgdex/cards-database (shallow, sparse)...');
  execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO_URL, tmp], { stdio: 'pipe' });
  execFileSync('git', ['-C', tmp, 'sparse-checkout', 'set', ...SUPPLEMENT_SETS.map(d => d.dir)], { stdio: 'pipe' });

  const cards = [];
  const codes = [];
  for (const def of SUPPLEMENT_SETS) {
    const tset = parseTcgdexModule(readFileSync(join(tmp, `${def.dir}.ts`), 'utf8'));
    const files = readdirSync(join(tmp, def.dir)).filter(f => /^\d+\.ts$/.test(f));
    const upstream = setsById[def.setId];
    const set = {
      id: def.setId,
      ptcgoCode: upstream?.ptcgoCode ?? def.ptcgoCode,
      name: upstream?.name ?? def.name,
      releaseDate: upstream?.releaseDate ?? tset.releaseDate.replaceAll('-', '/'),
      printedTotal: upstream?.printedTotal ?? files.length,
    };
    let added = 0;
    for (const file of files) {
      const localId = file.replace('.ts', '');
      if (cardsById[`${def.setId}-${parseInt(localId, 10)}`]) continue;
      const tc = { ...parseTcgdexModule(readFileSync(join(tmp, def.dir, file), 'utf8')), localId };
      if (!legalMarks.includes(tc.regulationMark)) continue;
      cards.push(tcgdexToCard(tc, set, findTwin(tc, byName)));
      added++;
    }
    if (added && !upstream) codes.push([set.ptcgoCode, set.id]);
    console.log(`  ${def.setId}: ${added} cards from TCGdex`);
  }
  return { cards, codes };
}
