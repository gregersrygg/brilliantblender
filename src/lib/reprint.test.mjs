import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isFunctionalReprint, normalizeAttacks, normalizeAbilities } from './reprint.js';

const pikachu = {
  hp: '60',
  attacks: [{ name: 'Thunder Shock', cost: ['Lightning'], damage: '20', text: '' }],
  abilities: [],
};

test('normalizeAttacks is order-independent', () => {
  const a = [
    { name: 'Quick Attack', cost: ['Colorless'], damage: '10', text: '' },
    { name: 'Thunderbolt', cost: ['Lightning', 'Lightning'], damage: '90', text: 'Discard all Energy.' },
  ];
  const b = [...a].reverse();
  assert.equal(normalizeAttacks(a), normalizeAttacks(b));
});

test('normalizeAttacks treats empty/undefined the same', () => {
  assert.equal(normalizeAttacks([]), normalizeAttacks(undefined));
});

test('normalizeAbilities is order-independent', () => {
  const a = [{ name: 'Static', text: 'x' }, { name: 'Volt', text: 'y' }];
  assert.equal(normalizeAbilities(a), normalizeAbilities([...a].reverse()));
});

test('isFunctionalReprint matches an identical print', () => {
  const legal = [{ hp: '60', attacks: pikachu.attacks, abilities: [] }];
  assert.equal(isFunctionalReprint(pikachu, legal), true);
});

test('isFunctionalReprint rejects a same-name card with different attacks', () => {
  const different = [
    { hp: '60', attacks: [{ name: 'Thunder Shock', cost: ['Lightning'], damage: '30', text: '' }], abilities: [] },
  ];
  assert.equal(isFunctionalReprint(pikachu, different), false);
});

test('isFunctionalReprint rejects a card with different HP', () => {
  const different = [{ hp: '70', attacks: pikachu.attacks, abilities: [] }];
  assert.equal(isFunctionalReprint(pikachu, different), false);
});

test('isFunctionalReprint returns false when there are no legal prints to compare', () => {
  assert.equal(isFunctionalReprint(pikachu, []), false);
});

test('isFunctionalReprint treats two textless Trainers (no hp/attacks/abilities) as identical', () => {
  const trainer = { hp: undefined, attacks: undefined, abilities: undefined };
  const legalTrainer = [{ hp: undefined, attacks: undefined, abilities: undefined }];
  assert.equal(isFunctionalReprint(trainer, legalTrainer), true);
});
