import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tcgdexToCard, findTwin, localize, buildSupplement } from './tcgdex-supplement.mjs';

const set = { id: 'mep', ptcgoCode: 'MEP', name: 'Mega Evolution Black Star Promos', releaseDate: '2025/09/26', printedTotal: 112 };

const megaLatias = {
  category: 'Pokemon', localId: '011', name: 'Mega Latias ex', rarity: 'Promo', hp: 280,
  types: ['Dragon'], stage: 'Basic', suffix: 'ex', retreat: 1, regulationMark: 'I',
  attacks: [{ cost: ['Colorless'], name: 'Strafe', effect: 'Switch.', damage: 40 }],
  weaknesses: [{ type: 'Lightning', value: 'x2' }],
};

test('maps a TCGdex Pokémon to the snapshot shape', () => {
  const card = tcgdexToCard(megaLatias, set, null);
  assert.equal(card.id, 'mep-11');
  assert.equal(card.number, '11');
  assert.equal(card.supertype, 'Pokémon');
  assert.deepEqual(card.subtypes, ['Basic', 'MEGA', 'ex']);
  assert.equal(card.hp, '280');
  assert.deepEqual(card.weaknesses, [{ type: 'Lightning', value: '×2' }]);
  assert.deepEqual(card.attacks, [{ name: 'Strafe', cost: ['Colorless'], convertedEnergyCost: 1, damage: '40', text: 'Switch.' }]);
  assert.equal(card.rules.length, 1);
  assert.match(card.rules[0], /3 Prize cards/);
  assert.deepEqual(card.legalities, { standard: 'Legal', expanded: 'Legal' });
  assert.deepEqual(card.images, {
    small: 'https://images.scrydex.com/pokemon/mep-11/small',
    large: 'https://images.scrydex.com/pokemon/mep-11/large',
  });
});

test('maps Trainer type and effect into subtypes and rules', () => {
  const tc = { category: 'Trainer', localId: '028', name: 'Celebratory Fanfare', trainerType: 'Stadium', effect: 'Heal.', regulationMark: 'I' };
  const card = tcgdexToCard(tc, set, null);
  assert.deepEqual(card.subtypes, ['Stadium']);
  assert.deepEqual(card.rules, ['Heal.']);
  assert.equal(tcgdexToCard({ ...tc, trainerType: 'Tool' }, set, null).subtypes[0], 'Pokémon Tool');
});

test('borrows gameplay fields from a functional upstream twin, keeping promo identity', () => {
  const twin = {
    name: 'Mega Latias ex', supertype: 'Pokémon', subtypes: ['Basic', 'MEGA', 'ex'], hp: '280', types: ['Dragon'],
    weaknesses: [], resistances: [], convertedRetreatCost: 1, abilities: [], evolvesFrom: null,
    attacks: [{ name: 'Strafe', text: 'Upstream text.' }], rules: ['Upstream rule.'],
  };
  const other = { ...twin, hp: '250' };
  const byName = new Map([['Mega Latias ex', [other, twin]]]);
  const found = findTwin(megaLatias, byName);
  assert.equal(found, twin);
  const card = tcgdexToCard(megaLatias, set, found);
  assert.deepEqual(card.rules, ['Upstream rule.']);
  assert.equal(card.attacks[0].text, 'Upstream text.');
  assert.equal(card.id, 'mep-11');
  assert.equal(card.regulationMark, 'I');
  assert.equal(card.rarity, 'Promo');
});

test('no twin when gameplay differs', () => {
  const byName = new Map([['Mega Latias ex', [{ supertype: 'Pokémon', hp: '280', attacks: [{ name: 'Other' }], abilities: [] }]]]);
  assert.equal(findTwin(megaLatias, byName), null);
});

test('localize keeps English text from per-language objects', () => {
  assert.deepEqual(
    localize({ name: { en: 'Alakazam', fr: 'Alakazam' }, attacks: [{ name: { en: 'Powerful Hand', de: 'Mächtige Hand' }, cost: ['Psychic'] }] }),
    { name: 'Alakazam', attacks: [{ name: 'Powerful Hand', cost: ['Psychic'] }] },
  );
});

test('buildSupplement adds legal cards missing upstream and registers unknown set codes', () => {
  const exported = [
    { setId: 'svp', releaseDate: '2023-03-31', cards: [
      { ...megaLatias, localId: '010', name: 'Upstream Has Me' },
      { ...megaLatias, localId: '166' },
    ] },
    { setId: 'mep', releaseDate: '2025-09-26', cards: [
      { ...megaLatias, localId: '011' },
      { ...megaLatias, localId: '012', regulationMark: 'G' },
    ] },
  ];
  const svpSet = { id: 'svp', ptcgoCode: 'PR-SV', name: 'SV Promos', releaseDate: '2023/01/01', printedTotal: 102 };
  const { cards, codes } = buildSupplement({
    exported,
    cardsById: { 'svp-10': {} },
    setsById: { svp: svpSet },
    byName: new Map(),
    legalMarks: ['H', 'I', 'J'],
  });
  assert.deepEqual(cards.map(c => c.id), ['svp-166', 'mep-11']);
  assert.equal(cards[0].set.ptcgoCode, 'PR-SV');
  assert.deepEqual(cards[1].set, { id: 'mep', ptcgoCode: 'MEP', name: 'Mega Evolution Black Star Promos', releaseDate: '2025/09/26', printedTotal: 2 });
  assert.deepEqual(codes, [['MEP', 'mep']]);
});

test('buildSupplement fails loudly when the export lacks a set', () => {
  assert.throws(() => buildSupplement({ exported: [], cardsById: {}, setsById: {}, byName: new Map(), legalMarks: ['I'] }));
});
