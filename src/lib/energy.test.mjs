import { test } from 'node:test';
import assert from 'node:assert/strict';

import { matchesBasicEnergyName, basicEnergyApiName, BASIC_ENERGY_API_NAMES, BASIC_ENERGY_NAME_RE } from './energy.js';

test('matchesBasicEnergyName matches the "Basic " prefixed snapshot/API name', () => {
  // SVE energies are named e.g. "Basic Psychic Energy" in both the snapshot and the
  // live API, but BASIC_ENERGY_API_NAMES maps to the prefix-less "Psychic Energy".
  assert.equal(matchesBasicEnergyName('Basic Psychic Energy', 'Psychic Energy'), true);
});

test('matchesBasicEnergyName matches an already prefix-less name', () => {
  assert.equal(matchesBasicEnergyName('Psychic Energy', 'Psychic Energy'), true);
});

test('matchesBasicEnergyName rejects a different energy type', () => {
  assert.equal(matchesBasicEnergyName('Basic Fire Energy', 'Psychic Energy'), false);
});

test('BASIC_ENERGY_API_NAMES maps every PTCGL energy letter', () => {
  assert.equal(BASIC_ENERGY_API_NAMES.P, 'Psychic Energy');
  assert.equal(BASIC_ENERGY_API_NAMES.R, 'Fire Energy');
  assert.equal(BASIC_ENERGY_API_NAMES.D, 'Darkness Energy');
});

test('BASIC_ENERGY_NAME_RE captures the energy letter', () => {
  assert.equal('Basic {P} Energy'.match(BASIC_ENERGY_NAME_RE)?.[1], 'P');
  assert.equal(BASIC_ENERGY_NAME_RE.test('Boss\'s Orders'), false);
});

test('basicEnergyApiName resolves the PTCGL bracketed form', () => {
  assert.equal(basicEnergyApiName('Basic {G} Energy'), 'Grass Energy');
});

test('basicEnergyApiName resolves the plain name (e.g. from a "MEE" line)', () => {
  assert.equal(basicEnergyApiName('Grass Energy'), 'Grass Energy');
  assert.equal(basicEnergyApiName('Fighting Energy'), 'Fighting Energy');
});

test('basicEnergyApiName resolves the "Basic " prefixed SVE name', () => {
  assert.equal(basicEnergyApiName('Basic Water Energy'), 'Water Energy');
});

test('basicEnergyApiName rejects special energy and non-energy cards', () => {
  assert.equal(basicEnergyApiName('Jet Energy'), null);
  assert.equal(basicEnergyApiName('Boss\'s Orders'), null);
});
