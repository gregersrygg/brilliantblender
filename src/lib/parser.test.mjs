import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDeck } from './parser.js';

/** Parse a single-card deck and return that card. */
function parseCard(line) {
  const { sections } = parseDeck(`Pokémon: 1\n${line}\n`);
  return sections[0].cards[0];
}

test('parses a plain card line', () => {
  assert.deepEqual(parseCard('4 Dragapult ex DRI 130'), {
    qty: 4,
    name: 'Dragapult ex',
    setCode: 'DRI',
    number: '130',
  });
});

test('parses a digit-leading set code (30th Celebration ships as "30C")', () => {
  assert.deepEqual(parseCard('2 Pikachu 30C 25'), {
    qty: 2,
    name: 'Pikachu',
    setCode: '30C',
    number: '25',
  });
});

test('parses a set code with a digit in the middle or at the end', () => {
  assert.equal(parseCard('1 Foo A2B 7').setCode, 'A2B');
  assert.equal(parseCard('1 Foo SV1 7').setCode, 'SV1');
});

test('parses a hyphenated promo set code', () => {
  assert.deepEqual(parseCard('1 Iono PR-SV 78'), {
    qty: 1,
    name: 'Iono',
    setCode: 'PR-SV',
    number: '78',
  });
});

test('a digits-only token is not treated as a set code', () => {
  // Without at least one letter there is nothing to tell the code from the number.
  assert.equal(parseCard('1 Foo 123 45').error, true);
});

test('names ending in an alphanumeric word are not mistaken for the set code', () => {
  assert.deepEqual(parseCard('3 Mewtwo VSTAR CRZ 36'), {
    qty: 3,
    name: 'Mewtwo VSTAR',
    setCode: 'CRZ',
    number: '36',
  });
  assert.equal(parseCard("2 Iono's Bellibolt ex JTG 53").name, "Iono's Bellibolt ex");
  assert.equal(parseCard('1 Basic {G} Energy SVE 9').name, 'Basic {G} Energy');
});

test('unrecognized lines become error stubs', () => {
  const card = parseCard('not a card line');
  assert.equal(card.error, true);
  assert.equal(card.setCode, '');
});

test('section counts sum the quantities', () => {
  const { sections, totalCount } = parseDeck(
    'Pokémon: 3\n2 Pikachu 30C 25\n1 Dragapult ex DRI 130\n\nTrainer: 1\n1 Rare Candy SVI 191\n\nTotal Cards: 4'
  );
  assert.equal(sections.length, 2);
  assert.equal(sections[0].count, 3);
  assert.equal(sections[1].count, 1);
  assert.equal(totalCount, 4);
});
