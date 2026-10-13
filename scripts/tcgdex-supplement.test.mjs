import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tcgdexToCard, findTwin } from './tcgdex-supplement.mjs';

const set = { id: 'mep', ptcgoCode: 'MEP', name: 'Mega Evolution Black Star Promos', releaseDate: '2025/09/26', printedTotal: 112 };

const megaLatias = {
  category: 'Pokemon', localId: '011', name: 'Mega Latias ex', rarity: 'Promo', hp: 280,
  types: ['Dragon'], stage: 'Basic', suffix: 'ex', retreat: 1, regulationMark: 'I',
  attacks: [{ cost: ['Colorless'], name: 'Strafe', effect: 'Switch.', damage: 40 }],
  weaknesses: [{ type: 'Lightning', value: 'x2' }],
  legal: { standard: true, expanded: true },
};

test('maps a TCGdex Pokémon to the snapshot shape', () => {
  const card = tcgdexToCard(megaLatias, set, null, null);
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
  assert.deepEqual(card.images, { small: null, large: null });
});

test('maps Trainer type and effect into subtypes and rules', () => {
  const tc = { category: 'Trainer', localId: '028', name: 'Celebratory Fanfare', trainerType: 'Stadium', effect: 'Heal.', regulationMark: 'I' };
  const card = tcgdexToCard(tc, set, null, null);
  assert.deepEqual(card.subtypes, ['Stadium']);
  assert.deepEqual(card.rules, ['Heal.']);
  assert.equal(tcgdexToCard({ ...tc, trainerType: 'Tool' }, set, null, null).subtypes[0], 'Pokémon Tool');
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
  const card = tcgdexToCard(megaLatias, set, null, found);
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
