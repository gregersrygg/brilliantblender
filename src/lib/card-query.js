// Card search query language. Pure (no imports) so it unit-tests under `node --test`
// and is shared between CardSearch.svelte (live filtering) and its tests.
//
// A query is whitespace-separated tokens. A bare word (or "quoted phrase") searches
// the card NAME; every other filter uses an `op:value` prefix. Semantics: OR within a
// single token's comma-separated values, AND across tokens. Grammar details live in
// docs/architecture.md.

export const ENERGY_LETTER_TO_NAME = {
  g: 'Grass', r: 'Fire', w: 'Water', l: 'Lightning', p: 'Psychic',
  f: 'Fighting', d: 'Darkness', m: 'Metal', n: 'Dragon', c: 'Colorless', y: 'Fairy',
};
const ENERGY_NAME_TO_LETTER = Object.fromEntries(
  Object.entries(ENERGY_LETTER_TO_NAME).map(([k, v]) => [v.toLowerCase(), k])
);

// Pokémon types actually present in the Standard pool (Fairy was retired), color-wheel order.
export const POKEMON_TYPES = ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Colorless'];

const TRAINER_MAP = { item: 'Item', supporter: 'Supporter', stadium: 'Stadium', tool: 'Pokémon Tool' };
const STAGE_MAP = { basic: 'Basic', 1: 'Stage 1', 2: 'Stage 2' };
const SUB_MAP = { tera: 'Tera', ancient: 'Ancient', future: 'Future', ace: 'ACE SPEC' };

// Short codes → snapshot `rarity` strings for the `rarity:` operator.
const RARITY_MAP = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare',
  double: 'Double Rare', dr: 'Double Rare',
  ace: 'ACE SPEC Rare', promo: 'Promo',
  ir: 'Illustration Rare', sir: 'Special Illustration Rare',
  ur: 'Ultra Rare', hyper: 'Hyper Rare', hr: 'Hyper Rare',
  pikachu: 'Pikachu Rare', future: 'Futuristic Rare',
};

// Chase / alternate-art printings hidden from results unless a `rarity:` filter opts in.
const CHASE_RARITIES = new Set([
  'Illustration Rare', 'Special Illustration Rare', 'Ultra Rare',
  'Hyper Rare', 'Mega Hyper Rare', 'MEGA_ATTACK_RARE',
  'Futuristic Rare', 'Black White Rare', 'Pikachu Rare', 'Rainbow Rare',
]);

const OPERATORS = new Set(['text', 'type', 'weak', 'tr', 'stage', 'pri', 'sub', 'hp', 'rc', 'ac', 'set', 'reg', 'rarity']);

function stripSymbols(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '');
}
function norm(str) {
  return stripSymbols(String(str).toLowerCase());
}

/** Split a query string into raw tokens, preserving each token's source offset. */
function tokenize(str) {
  const out = [];
  const n = str.length;
  let i = 0;
  while (i < n) {
    if (str[i] === ' ' || str[i] === '\t') { i++; continue; }
    const start = i;
    let j = i;
    while (j < n && /[a-zA-Z]/.test(str[j])) j++;
    let op = null;
    let valueStart = i;
    if (op === null && j < n && str[j] === ':' && j > i) {
      op = str.slice(i, j).toLowerCase();
      j++;
      valueStart = j;
    }
    let quoted = false;
    if (str[j] === '"') {
      quoted = true;
      let k = j + 1;
      while (k < n && str[k] !== '"') k++;
      j = k < n ? k + 1 : k; // include closing quote when present
    } else {
      while (j < n && str[j] !== ' ' && str[j] !== '\t') j++;
    }
    const raw = str.slice(start, j);
    let value = str.slice(valueStart, j);
    if (quoted) value = value.replace(/^"/, '').replace(/"$/, '');
    out.push({ raw, index: start, op, value, quoted });
    i = j;
  }
  return out;
}

function normalizeType(s) {
  const t = s.trim().toLowerCase();
  if (!t) return null;
  if (ENERGY_LETTER_TO_NAME[t]) return ENERGY_LETTER_TO_NAME[t];
  if (ENERGY_NAME_TO_LETTER[t]) return ENERGY_LETTER_TO_NAME[ENERGY_NAME_TO_LETTER[t]];
  return null;
}

function splitValues(value) {
  return value.split(',').map(s => s.trim()).filter(Boolean);
}

function parseComparable(value) {
  const m = /^(\d+)([+-])?$/.exec(value.trim());
  if (!m) return null;
  return { n: parseInt(m[1], 10), op: m[2] === '+' ? 'gte' : m[2] === '-' ? 'lte' : 'eq' };
}

/** Parse an `ac:` value into a cost matcher, or null when malformed. */
export function parseAttackCost(value) {
  const v = value.trim();
  if (v === '') return null;
  // Bare number → total-energy-count mode.
  if (/^\d+[+-]?$/.test(v)) {
    const c = parseComparable(v);
    return c && { mode: 'total', ...c };
  }
  // Symbol mode: a run of {x} groups, each with optional count and +/- modifier.
  const re = /\{([a-z*])\}(\d+)?([+-])?/g;
  const concrete = {};
  let wildcard = null;
  let consumed = 0;
  let m;
  while ((m = re.exec(v))) {
    if (m.index !== consumed) return null; // gap → malformed
    consumed = re.lastIndex;
    const sym = m[1];
    const n = m[2] ? parseInt(m[2], 10) : 1;
    const op = m[3] === '+' ? 'gte' : m[3] === '-' ? 'lte' : 'eq';
    if (sym === '*') {
      wildcard = wildcard ? { n: wildcard.n + n, op } : { n, op };
    } else if (concrete[sym]) {
      concrete[sym] = { n: concrete[sym].n + n, op: op === 'eq' && concrete[sym].op === 'eq' ? 'eq' : 'gte' };
    } else {
      concrete[sym] = { n, op };
    }
  }
  if (consumed !== v.length || (Object.keys(concrete).length === 0 && !wildcard)) return null;
  return { mode: 'symbols', concrete, wildcard };
}

function cmp(c, n, op) {
  return op === 'gte' ? c >= n : op === 'lte' ? c <= n : c === n;
}

/** Non-"Free" energy letters of an attack's cost. */
function costLetters(cost) {
  return (cost || [])
    .filter(s => s !== 'Free')
    .map(s => ENERGY_NAME_TO_LETTER[s.toLowerCase()] ?? '?');
}

function attackMatchesCost(cost, pat) {
  const letters = costLetters(cost);
  if (pat.mode === 'total') return cmp(letters.length, pat.n, pat.op);
  const specified = Object.keys(pat.concrete);
  const open = !!pat.wildcard || specified.some(s => pat.concrete[s].op !== 'eq');
  for (const sym of specified) {
    const c = letters.filter(l => l === sym).length;
    if (!cmp(c, pat.concrete[sym].n, pat.concrete[sym].op)) return false;
  }
  const leftover = letters.filter(l => !pat.concrete[l]).length;
  if (pat.wildcard) return cmp(leftover, pat.wildcard.n, pat.wildcard.op);
  if (!open) return leftover === 0;
  return true;
}

function prizeClass(card) {
  const sub = card.subtypes || [];
  if (sub.includes('MEGA')) return 3;
  if (sub.includes('ex')) return 2;
  if (card.supertype === 'Pokémon') return 1;
  return null;
}

function classify(t) {
  const { op, value, quoted } = t;
  const base = { raw: t.raw, index: t.index, op, valid: false };

  if (op === null) {
    if (!value) return { ...base, kind: 'name', value: '', label: '' };
    return { ...base, kind: 'name', value, exact: quoted, valid: true, label: quoted ? `"${value}"` : value };
  }
  if (!OPERATORS.has(op)) return { ...base, kind: 'unknown', label: t.raw };

  switch (op) {
    case 'text':
      return value
        ? { ...base, kind: 'text', value, exact: quoted, valid: true, label: quoted ? `text “${value}”` : `text: ${value}` }
        : { ...base, kind: 'text', value: '', label: 'text:' };
    case 'type':
    case 'weak': {
      const names = splitValues(value).map(normalizeType);
      const ok = names.length > 0 && names.every(Boolean);
      return { ...base, kind: op, values: names, valid: ok,
        label: (op === 'weak' ? 'Weak: ' : '') + (ok ? names.join(' / ') : value) };
    }
    case 'tr': {
      const vals = splitValues(value).map(s => TRAINER_MAP[s.toLowerCase()]);
      const ok = vals.length > 0 && vals.every(Boolean);
      return { ...base, kind: 'tr', values: vals, valid: ok, label: ok ? vals.join(' / ') : value };
    }
    case 'stage': {
      const vals = splitValues(value).map(s => STAGE_MAP[s.toLowerCase()]);
      const ok = vals.length > 0 && vals.every(Boolean);
      return { ...base, kind: 'stage', values: vals, valid: ok, label: ok ? vals.join(' / ') : value };
    }
    case 'sub': {
      const vals = splitValues(value).map(s => SUB_MAP[s.toLowerCase()]);
      const ok = vals.length > 0 && vals.every(Boolean);
      return { ...base, kind: 'sub', values: vals, valid: ok, label: ok ? vals.join(' / ') : value };
    }
    case 'pri': {
      const vals = splitValues(value).map(s => parseInt(s, 10)).filter(n => n >= 1 && n <= 3);
      const ok = vals.length === splitValues(value).length && vals.length > 0;
      const name = { 1: 'Single prize', 2: 'ex · 2 prizes', 3: 'Mega · 3 prizes' };
      return { ...base, kind: 'pri', values: vals, valid: ok, label: ok ? vals.map(v => name[v]).join(' / ') : value };
    }
    case 'hp':
    case 'rc': {
      const c = parseComparable(value);
      const sym = { eq: '=', gte: '≥', lte: '≤' };
      return { ...base, kind: op, ...(c || {}), valid: !!c,
        label: c ? `${op === 'hp' ? 'HP' : 'Retreat'} ${sym[c.op]} ${c.n}` : `${op}:${value}` };
    }
    case 'ac': {
      const pat = parseAttackCost(value);
      return { ...base, kind: 'ac', pattern: pat, value, valid: !!pat, label: `Cost ${value}` };
    }
    case 'set': {
      const vals = splitValues(value).map(s => s.toUpperCase());
      return { ...base, kind: 'set', values: vals, valid: vals.length > 0, label: vals.join(' / ') };
    }
    case 'reg': {
      const vals = splitValues(value).map(s => s.toUpperCase());
      return { ...base, kind: 'reg', values: vals, valid: vals.length > 0, label: `Reg ${vals.join(' / ')}` };
    }
    case 'rarity': {
      const raw = splitValues(value);
      if (raw.length === 1 && raw[0].toLowerCase() === 'all') {
        return { ...base, kind: 'rarity', all: true, values: [], valid: true, label: 'All rarities' };
      }
      const vals = raw.map(s => RARITY_MAP[s.toLowerCase()]);
      const ok = vals.length > 0 && vals.every(Boolean);
      return { ...base, kind: 'rarity', all: false, values: vals, valid: ok,
        label: ok ? vals.join(' / ') : `rarity:${value}` };
    }
  }
}

/** Parse a query string into structured tokens (invalid/incomplete ones kept, flagged). */
export function parseQuery(str) {
  return { tokens: tokenize(str || '').map(classify) };
}

function cardText(card) {
  const parts = [];
  for (const a of card.attacks || []) { if (a.name) parts.push(a.name); if (a.text) parts.push(a.text); }
  for (const a of card.abilities || []) { if (a.name) parts.push(a.name); if (a.text) parts.push(a.text); }
  return norm(parts.join(' '));
}

function matchToken(card, tk) {
  switch (tk.kind) {
    case 'name':
      return norm(card.name).includes(norm(tk.value));
    case 'text':
      return cardText(card).includes(norm(tk.value));
    case 'type':
      return (card.types || []).some(t => tk.values.includes(t));
    case 'weak':
      return (card.weaknesses || []).some(w => tk.values.includes(w.type));
    case 'tr':
    case 'stage':
    case 'sub':
      return (card.subtypes || []).some(s => tk.values.includes(s));
    case 'pri':
      return tk.values.includes(prizeClass(card));
    case 'hp': {
      const hp = parseInt(card.hp, 10);
      return !isNaN(hp) && cmp(hp, tk.n, tk.op);
    }
    case 'rc':
      return card.supertype === 'Pokémon' && cmp(card.convertedRetreatCost ?? 0, tk.n, tk.op);
    case 'ac':
      return (card.attacks || []).some(a => attackMatchesCost(a.cost, tk.pattern));
    case 'set':
      return tk.values.includes((card.set?.ptcgoCode || '').toUpperCase());
    case 'reg':
      return tk.values.includes((card.regulationMark || '').toUpperCase());
    default:
      return true; // unknown/incomplete tokens don't constrain results
  }
}

/** True when a card satisfies every valid token (AND across tokens). */
export function matchesQuery(card, parsed) {
  let rarityTok = null;
  for (const tk of parsed.tokens) {
    if (!tk.valid) continue;
    if (tk.kind === 'rarity') { rarityTok = tk; continue; }
    if (!matchToken(card, tk)) return false;
  }
  // Chase / alt-art printings are hidden by default; a `rarity:` filter opts them back in
  // (`rarity:all` shows everything; `rarity:ir,sir` narrows to specific rarities).
  if (rarityTok) {
    if (!rarityTok.all && !rarityTok.values.includes(card.rarity)) return false;
  } else if (CHASE_RARITIES.has(card.rarity)) {
    return false;
  }
  return true;
}

/** True when the query has at least one valid filter or name term. */
export function hasQuery(parsed) {
  return parsed.tokens.some(t => t.valid);
}

/** Append a filter token to the end of the query string (per the append-at-end rule). */
export function appendToken(str, tokenText) {
  const s = (str || '').replace(/\s+$/, '');
  return s ? `${s} ${tokenText}` : tokenText;
}

/** Remove one token (identified by its source offset) from the query string. */
export function removeToken(str, token) {
  const before = str.slice(0, token.index);
  const after = str.slice(token.index + token.raw.length);
  return (before + after).replace(/\s{2,}/g, ' ').replace(/^\s+|\s+$/g, '');
}
