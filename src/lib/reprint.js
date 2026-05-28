// Functional-reprint detection, per Tournament Handbook §4.1.3: two cards count as the
// same reprint when their name matches and "all text printed on the new card is
// functionally identical to that of the older card". We approximate that text identity
// with HP + attacks + abilities (the fields the API exposes structurally).
//
// Pure (no imports) so it can be shared by PrintPicker.svelte (print grouping/legality)
// and the deck legality logic, and unit-tested under `node --test`.

export function normalizeAttacks(attacks) {
  if (!attacks || attacks.length === 0) return '[]';
  return JSON.stringify(
    [...attacks]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(a => ({
        name: a.name,
        damage: a.damage ?? '',
        cost: [...(a.cost ?? [])].sort().join(','),
        text: a.text ?? '',
      }))
  );
}

export function normalizeAbilities(abilities) {
  if (!abilities || abilities.length === 0) return '[]';
  return JSON.stringify(
    [...abilities]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(a => ({ name: a.name, text: a.text ?? '' }))
  );
}

/**
 * True when `card` is functionally identical to at least one of `legalPrints`.
 * @param {{hp?: any, attacks?: any[], abilities?: any[]}} card
 * @param {Array<{hp?: any, attacks?: any[], abilities?: any[]}>} legalPrints
 * @returns {boolean}
 */
export function isFunctionalReprint(card, legalPrints) {
  if (legalPrints.length === 0) return false;
  return legalPrints.some(
    legal =>
      card.hp === legal.hp &&
      normalizeAttacks(card.attacks) === normalizeAttacks(legal.attacks) &&
      normalizeAbilities(card.abilities) === normalizeAbilities(legal.abilities)
  );
}
