import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseQuery, matchesQuery, hasQuery, parseAttackCost, appendToken, removeToken,
} from './card-query.js';

// --- fixtures ---------------------------------------------------------------
const charizard = {
  name: 'Charizard ex', supertype: 'Pokémon', subtypes: ['Stage 2', 'ex'],
  hp: '330', types: ['Fire'], weaknesses: [{ type: 'Water', value: '×2' }], rarity: 'Double Rare',
  convertedRetreatCost: 2, regulationMark: 'H', set: { ptcgoCode: 'OBF' },
  attacks: [
    { name: 'Burning Darkness', cost: ['Fire', 'Fire'], text: 'This attack does 30 more damage.' },
    { name: 'Slash', cost: ['Fire', 'Colorless', 'Colorless'], text: '' },
  ],
  abilities: [{ name: 'Infernal Reign', text: 'Search your deck for Fire Energy.' }], rules: [],
};
const budew = {
  name: 'Budew', supertype: 'Pokémon', subtypes: ['Basic'], hp: '30',
  types: ['Grass'], weaknesses: [{ type: 'Fire', value: '×2' }], convertedRetreatCost: 1,
  regulationMark: 'I', set: { ptcgoCode: 'PRE' }, rarity: 'Common',
  attacks: [{ name: 'Itchy Pollen', cost: [], text: '' }], abilities: [], rules: [],
};
const bossOrders = {
  name: "Boss's Orders", supertype: 'Trainer', subtypes: ['Supporter'], hp: null,
  types: [], weaknesses: [], convertedRetreatCost: 0, regulationMark: 'H', rarity: 'Uncommon',
  set: { ptcgoCode: 'PAL' }, attacks: [], abilities: [],
  rules: ['Switch in 1 of your opponent’s Benched Pokémon to the Active Spot.'],
};
const megaLucario = {
  name: 'Mega Lucario ex', supertype: 'Pokémon', subtypes: ['Stage 2', 'MEGA', 'ex'],
  hp: '340', types: ['Fighting'], weaknesses: [{ type: 'Psychic', value: '×2' }],
  convertedRetreatCost: 3, regulationMark: 'J', set: { ptcgoCode: 'MEG' }, rarity: 'Double Rare',
  attacks: [{ name: 'Aura Blast', cost: ['Fighting', 'Fighting', 'Colorless'], text: '' }],
  abilities: [], rules: [],
};
// Alt-art printing of Charizard — hidden by default (not in ALL to keep other counts stable).
const charizardAlt = { ...charizard, rarity: 'Special Illustration Rare', set: { ptcgoCode: 'OBF' } };
const ALL = [charizard, budew, bossOrders, megaLucario];
const names = q => ALL.filter(c => matchesQuery(c, parseQuery(q))).map(c => c.name);

// --- tokenizer --------------------------------------------------------------
test('bare words are name terms, ANDed', () => {
  const { tokens } = parseQuery('mega lucario');
  assert.equal(tokens.length, 2);
  assert.ok(tokens.every(t => t.kind === 'name' && t.valid));
});
test('quoted phrase is one exact name token', () => {
  const { tokens } = parseQuery('"boss\'s orders"');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].kind, 'name');
  assert.equal(tokens[0].exact, true);
  assert.equal(tokens[0].value, "boss's orders");
});
test('operator value can be a quoted phrase with spaces', () => {
  const { tokens } = parseQuery('text:"more damage"');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].kind, 'text');
  assert.equal(tokens[0].value, 'more damage');
});
test('half-typed operator is kept but invalid', () => {
  const { tokens } = parseQuery('type:fire ac:{r');
  assert.equal(tokens[1].valid, false);
  assert.equal(tokens[1].raw, 'ac:{r');
});
test('unknown operator does not constrain results', () => {
  assert.deepEqual(names('foo:bar'), ['Charizard ex', 'Budew', "Boss's Orders", 'Mega Lucario ex']);
});

// --- hasQuery ---------------------------------------------------------------
test('hasQuery is false for empty / whitespace / incomplete-only queries', () => {
  assert.equal(hasQuery(parseQuery('')), false);
  assert.equal(hasQuery(parseQuery('   ')), false);
  assert.equal(hasQuery(parseQuery('type:')), false);   // incomplete operator only
});
test('hasQuery is true once any name term or valid filter is present', () => {
  assert.equal(hasQuery(parseQuery('char')), true);
  assert.equal(hasQuery(parseQuery('type:fire')), true);
  assert.equal(hasQuery(parseQuery('type: char')), true); // one incomplete + one valid
});

// --- name / text ------------------------------------------------------------
test('name search is substring, accent- and case-insensitive', () => {
  assert.deepEqual(names('char'), ['Charizard ex']);
});
test('text: searches attack/ability text, not the name or rule box', () => {
  assert.deepEqual(names('text:"more damage"'), ['Charizard ex']);
  assert.deepEqual(names('text:switch'), []); // rule-box text is not searched
  assert.deepEqual(names('text:charizard'), []); // name only lives in name search
});
test('text: also searches ability name and ability text', () => {
  assert.deepEqual(names('text:infernal'), ['Charizard ex']);        // ability name
  assert.deepEqual(names('text:"search your deck"'), ['Charizard ex']); // ability text
});
test('an unclosed quote is tolerated and still searches', () => {
  assert.deepEqual(names('text:"more damage'), ['Charizard ex']);
});
test('an invalid operator value does not constrain results', () => {
  // type:bogus is flagged invalid, so it is skipped rather than matching nothing.
  assert.deepEqual(names('type:bogus').sort(), ['Boss\'s Orders', 'Budew', 'Charizard ex', 'Mega Lucario ex']);
});

// --- type / weak ------------------------------------------------------------
test('type: accepts letters and names, OR within', () => {
  assert.deepEqual(names('type:r'), ['Charizard ex']);
  assert.deepEqual(names('type:fire'), ['Charizard ex']);
  assert.deepEqual(names('type:grass,fighting').sort(), ['Budew', 'Mega Lucario ex']);
});
test('weak: filters by weakness type', () => {
  assert.deepEqual(names('weak:water'), ['Charizard ex']);
  assert.deepEqual(names('weak:fire'), ['Budew']);
});

// --- hp / rc ----------------------------------------------------------------
test('hp: supports =, +, -', () => {
  assert.deepEqual(names('hp:330'), ['Charizard ex']);
  assert.deepEqual(names('hp:330+').sort(), ['Charizard ex', 'Mega Lucario ex']);
  assert.deepEqual(names('hp:30-'), ['Budew']);
});
test('hp: skips cards without a numeric HP (Trainers)', () => {
  // Boss's Orders (hp null) never satisfies an HP filter, even a wide-open one.
  assert.deepEqual(names('hp:1+').sort(), ['Budew', 'Charizard ex', 'Mega Lucario ex']);
});
test('rc: only matches Pokémon and respects operators', () => {
  assert.deepEqual(names('rc:3'), ['Mega Lucario ex']);
  assert.deepEqual(names('rc:0'), []); // trainer excluded, no 0-retreat Pokémon here
  assert.deepEqual(names('rc:2+').sort(), ['Charizard ex', 'Mega Lucario ex']);
  assert.deepEqual(names('rc:1-'), ['Budew']);
  // Even a 0-or-more retreat filter excludes the Trainer (rc: is Pokémon-only).
  assert.deepEqual(names('rc:0+').sort(), ['Budew', 'Charizard ex', 'Mega Lucario ex']);
});

// --- trainer / stage / prizes / sub ----------------------------------------
test('tr: maps friendly names to subtypes', () => {
  assert.deepEqual(names('tr:supporter'), ["Boss's Orders"]);
});
test('stage: basic/1/2', () => {
  assert.deepEqual(names('stage:basic'), ['Budew']);
  assert.deepEqual(names('stage:2').sort(), ['Charizard ex', 'Mega Lucario ex']);
});
test('pri: 2 = ex (not Mega), 3 = Mega, 1 = single-prize', () => {
  assert.deepEqual(names('pri:2'), ['Charizard ex']);
  assert.deepEqual(names('pri:3'), ['Mega Lucario ex']);
  assert.deepEqual(names('pri:1'), ['Budew']);
});

// --- set / reg --------------------------------------------------------------
test('set: and reg: match on set code / regulation mark', () => {
  assert.deepEqual(names('set:obf'), ['Charizard ex']);
  assert.deepEqual(names('reg:j'), ['Mega Lucario ex']);
});
test('set: and reg: OR their comma-separated values', () => {
  assert.deepEqual(names('set:obf,pal').sort(), ["Boss's Orders", 'Charizard ex']);
  assert.deepEqual(names('reg:h,i').sort(), ["Boss's Orders", 'Budew', 'Charizard ex']);
});

// --- rarity -----------------------------------------------------------------
const rarityNames = (q, cards) => cards.filter(c => matchesQuery(c, parseQuery(q))).map(c => c.name);
test('chase / alt-art rarities are hidden by default', () => {
  const pool = [charizard, charizardAlt];
  // Only the functional Double Rare printing survives a plain query.
  assert.deepEqual(rarityNames('char', pool), ['Charizard ex']);
});
test('rarity:all opts alt-art printings back in', () => {
  const pool = [charizard, charizardAlt];
  assert.equal(rarityNames('char rarity:all', pool).length, 2);
});
test('rarity:<code> narrows to specific rarities', () => {
  const pool = [charizard, charizardAlt];
  assert.deepEqual(rarityNames('rarity:sir', pool), ['Charizard ex']); // the alt-art one
  assert.deepEqual(rarityNames('rarity:double', pool), ['Charizard ex']); // the functional one
});
test('rarity: parses all / codes / invalid', () => {
  assert.equal(parseQuery('rarity:all').tokens[0].all, true);
  assert.deepEqual(parseQuery('rarity:ir,sir').tokens[0].values, ['Illustration Rare', 'Special Illustration Rare']);
  assert.equal(parseQuery('rarity:bogus').tokens[0].valid, false);
});
test('an invalid rarity token still hides chase rarities by default', () => {
  // rarity: (empty) and rarity:bogus are invalid, so they are skipped and the
  // default hide-chase rule stays in force — they must NOT reveal alt-art printings.
  const pool = [charizard, charizardAlt];
  assert.deepEqual(rarityNames('rarity:', pool), ['Charizard ex']);
  assert.deepEqual(rarityNames('rarity:bogus', pool), ['Charizard ex']);
});

// --- sub --------------------------------------------------------------------
test('sub:ace maps to the ACE SPEC subtype', () => {
  const acespec = { ...bossOrders, name: 'Prime Catcher', subtypes: ['Item', 'ACE SPEC'] };
  assert.deepEqual(rarityNames('sub:ace', [bossOrders, acespec]), ['Prime Catcher']);
});

// --- attack cost grammar ----------------------------------------------------
test('parseAttackCost — total mode', () => {
  assert.deepEqual(parseAttackCost('2'), { mode: 'total', n: 2, op: 'eq' });
  assert.deepEqual(parseAttackCost('2+'), { mode: 'total', n: 2, op: 'gte' });
  assert.deepEqual(parseAttackCost('0'), { mode: 'total', n: 0, op: 'eq' });
});
test('parseAttackCost — symbol mode with counts, modifiers, wildcard', () => {
  assert.deepEqual(parseAttackCost('{r}'), { mode: 'symbols', concrete: { r: { n: 1, op: 'eq' } }, wildcard: null });
  assert.deepEqual(parseAttackCost('{r}2{c}'),
    { mode: 'symbols', concrete: { r: { n: 2, op: 'eq' }, c: { n: 1, op: 'eq' } }, wildcard: null });
  assert.deepEqual(parseAttackCost('{r}2+'), { mode: 'symbols', concrete: { r: { n: 2, op: 'gte' } }, wildcard: null });
  assert.deepEqual(parseAttackCost('{*}2'), { mode: 'symbols', concrete: {}, wildcard: { n: 2, op: 'eq' } });
});
test('parseAttackCost — malformed returns null', () => {
  assert.equal(parseAttackCost('{r'), null);
  assert.equal(parseAttackCost('{r}x'), null);
  assert.equal(parseAttackCost(''), null);
});
test('parseAttackCost — repeated symbols and wildcards accumulate', () => {
  // {r}{r} folds into a single count-2 requirement, same as {r}2.
  assert.deepEqual(parseAttackCost('{r}{r}'), { mode: 'symbols', concrete: { r: { n: 2, op: 'eq' } }, wildcard: null });
  assert.deepEqual(parseAttackCost('{*}{*}'), { mode: 'symbols', concrete: {}, wildcard: { n: 2, op: 'eq' } });
});
test('ac: {r}{r} (repeated symbol) matches exactly two Fire', () => {
  // Same result as the count form ac:{r}2 — Charizard's Burning Darkness is {r}{r}.
  assert.deepEqual(names('ac:{r}{r}'), ['Charizard ex']);
});
test('ac: exact base — {r}2 is exactly two Fire, nothing else', () => {
  // Charizard has {r}{r} (Burning Darkness) → matches exactly two Fire
  assert.deepEqual(names('ac:{r}2'), ['Charizard ex']);
});
test('ac: {r} exact one-Fire matches no attack here (both costs differ)', () => {
  assert.deepEqual(names('ac:{r}'), []);
});
test('ac: or-more modifier allows extra energy of other types', () => {
  // Slash is {r}{c}{c}: one Fire or more, plus anything
  assert.deepEqual(names('ac:{r}1+').sort(), ['Charizard ex']);
});
test('ac: wildcard fills remaining slots', () => {
  // Charizard Slash {r}{c}{c}: one Fire + 2 any
  assert.deepEqual(names('ac:{r}{*}2'), ['Charizard ex']);
});
test('ac: total energy count', () => {
  assert.deepEqual(names('ac:3').sort(), ['Charizard ex', 'Mega Lucario ex']);
  assert.deepEqual(names('ac:2+').sort(), ['Charizard ex', 'Mega Lucario ex']);
});
test('ac:0 finds free attacks (empty cost)', () => {
  assert.deepEqual(names('ac:0'), ['Budew']);
});
test('ac matches if ANY one attack satisfies', () => {
  // Charizard has both {r}{r} and {r}{c}{c}; total-3 matches via Slash
  assert.ok(names('ac:3').includes('Charizard ex'));
});

// --- combining --------------------------------------------------------------
test('AND across tokens, OR within a token', () => {
  assert.deepEqual(names('type:fire hp:300+'), ['Charizard ex']);
  assert.deepEqual(names('type:fire,fighting stage:2').sort(), ['Charizard ex', 'Mega Lucario ex']);
});

// --- string surgery ---------------------------------------------------------
test('appendToken adds at the end with a single space', () => {
  assert.equal(appendToken('type:fire', 'hp:200+'), 'type:fire hp:200+');
  assert.equal(appendToken('', 'type:fire'), 'type:fire');
  assert.equal(appendToken('type:fire ', 'hp:200+'), 'type:fire hp:200+');
});
test('removeToken excises one token and tidies whitespace', () => {
  const { tokens } = parseQuery('type:fire hp:200+ ac:2');
  assert.equal(removeToken('type:fire hp:200+ ac:2', tokens[1]), 'type:fire ac:2');
  assert.equal(removeToken('type:fire hp:200+ ac:2', tokens[0]), 'hp:200+ ac:2');
});
