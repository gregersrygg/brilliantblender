import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameCardName } from './card-name.js';

test('matches identical names', () => {
  assert.ok(sameCardName('Iono', 'Iono'));
});

test('ignores apostrophe variants, case, accents and spacing', () => {
  assert.ok(sameCardName("Boss's Orders", 'Boss’s Orders'));
  assert.ok(sameCardName('poké pad', 'Poke Pad'));
  assert.ok(sameCardName('Exp.  Share', 'Exp. Share'));
});

test('never matches a prefix or substring', () => {
  assert.ok(!sameCardName('Iono', "Iono's Kilowattrel"));
  assert.ok(!sameCardName('Psyduck', "Misty's Psyduck"));
  assert.ok(!sameCardName('Super Rod', 'Super Rod ex'));
});
