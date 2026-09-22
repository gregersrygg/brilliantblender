// Basic-energy helpers. Pure (no imports) so it can be unit-tested under
// `node --test` and shared between deck.svelte.js (PTCGL line parsing) and
// snapshot.js (SVE lookup).

// PTCGL writes basic energy as "Basic {P} Energy"; the capture group is the type letter.
export const BASIC_ENERGY_NAME_RE = /^Basic \{([A-Z])\} Energy$/;

// Map the PTCGL type letter to the energy's card name.
export const BASIC_ENERGY_API_NAMES = {
  G: 'Grass Energy',
  R: 'Fire Energy',
  W: 'Water Energy',
  L: 'Lightning Energy',
  P: 'Psychic Energy',
  F: 'Fighting Energy',
  D: 'Darkness Energy',
  M: 'Metal Energy',
  Y: 'Fairy Energy',
};

const BASIC_ENERGY_NAMES = new Set(Object.values(BASIC_ENERGY_API_NAMES));

/**
 * Canonical basic-energy API name for a deck-line card name, or null if it isn't a
 * basic energy. Matches PTCGL's "Basic {G} Energy" form and the plain "Grass Energy"
 * form (with or without a leading "Basic "), so both route to the SVE snapshot lookup.
 * @param {string} name - the deck line's card name
 * @returns {string|null}
 */
export function basicEnergyApiName(name) {
  const bracketed = name.match(BASIC_ENERGY_NAME_RE);
  if (bracketed) return BASIC_ENERGY_API_NAMES[bracketed[1]];
  const plain = name.replace(/^Basic /, '');
  return BASIC_ENERGY_NAMES.has(plain) ? plain : null;
}

/**
 * True when a card's name refers to the same basic energy as `apiName`.
 * SVE basic energies are named with a "Basic " prefix in both the snapshot and the
 * live API (e.g. "Basic Psychic Energy"), while BASIC_ENERGY_API_NAMES uses the
 * prefix-less form ("Psychic Energy"); strip the prefix before comparing.
 * @param {string} cardName - the card's name (may carry a "Basic " prefix)
 * @param {string} apiName - the prefix-less energy name to match against
 * @returns {boolean}
 */
export function matchesBasicEnergyName(cardName, apiName) {
  return cardName.replace(/^Basic /, '') === apiName;
}
