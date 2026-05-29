// src/lib/deck.svelte.js
import { parseDeck } from './parser.js';
import { fetchSets, resolveCard, fetchNewestLegalPrint, fetchBasicEnergyFromSve, getPtcgoCode, fetchPrintsByName } from './api.js';
import { LEGAL_REGULATION_MARKS } from './config.js';
import { sortDeck } from './sort.js';
import { notLegalUntil, todayIso, isSetLegalOn } from './legality.js';
import { isFunctionalReprint } from './reprint.js';
import setLegality from '../data/set-legality.json';

// Conservative (date-only) legality date for a card's set: the legalFrom date when the
// set isn't tournament-legal yet, else null. Treats the card as a brand-new card; the
// §4.1.3 reprint rule is applied asynchronously by refineLegality().
function legalityFor(setId) {
  return notLegalUntil(setLegality[setId], todayIso());
}

// Apply Handbook §4.1.3 to a single card, updating card.notLegalUntil in place: a card
// from a not-yet-legal set is legal from the set's RELEASE date (not its later legalFrom)
// when it is a functionally-identical reprint of a card whose set is already legal.
// Falls back to the conservative date-only value on any lookup failure.
async function refineLegality(card) {
  // Basic energy never rotates or waits for legality.
  if (card.isBasicEnergy) {
    card.notLegalUntil = null;
    return;
  }
  const entry = setLegality[card.setId];
  const today = todayIso();
  if (!entry || isSetLegalOn(entry, today)) {
    card.notLegalUntil = null;
    return;
  }
  let isReprint = false;
  try {
    const prints = await fetchPrintsByName(card.name);
    const self = prints.find(p => p.set?.id === card.setId && p.number === card.number);
    if (self) {
      const legalTwins = prints
        .filter(p => p !== self
          && LEGAL_REGULATION_MARKS.includes(p.regulationMark)
          && isSetLegalOn(setLegality[p.set?.id], today))
        .map(p => ({ hp: p.hp, attacks: p.attacks, abilities: p.abilities }));
      isReprint = isFunctionalReprint(
        { hp: self.hp, attacks: self.attacks, abilities: self.abilities },
        legalTwins
      );
    }
  } catch {
    // Lookup failed — keep the conservative (warn) value computed below.
  }
  card.notLegalUntil = notLegalUntil(entry, today, { isReprint });
}

const BASIC_ENERGY_NAME_RE = /^Basic \{([A-Z])\} Energy$/;
const BASIC_ENERGY_API_NAMES = {
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

/**
 * Create a reactive deck state manager.
 * @returns {{ deck: object, loading: boolean, error: string|null, loadDeck: function, exportDeck: function, reset: function }}
 */
export function createDeck() {
  let deck = $state(null);
  let loading = $state(false);
  let error = $state(null);

  async function loadDeck(text) {
    error = null;
    loading = true;

    const parsed = parseDeck(text);
    // Initialize each card with loading state
    for (const section of parsed.sections) {
      for (const card of section.cards) {
        card.image = null;
        card.cardLoading = !card.error;
        card.cardError = card.error ? 'Unrecognized card line' : null;
        card.isBasicEnergy = BASIC_ENERGY_NAME_RE.test(card.name);
      }
    }
    deck = parsed;
    sortDeck(deck);

    let setMap;
    try {
      setMap = await fetchSets();
    } catch (e) {
      error = 'Failed to load set data. Please try again.';
      loading = false;
      return;
    }

    // Fetch all cards in parallel, updating each as it resolves
    const promises = [];
    for (const section of deck.sections) {
      for (const card of section.cards) {
        if (card.error) continue;

        const basicMatch = card.name.match(BASIC_ENERGY_NAME_RE);
        const basicApiName = basicMatch ? BASIC_ENERGY_API_NAMES[basicMatch[1]] : null;
        if (basicApiName) {
          promises.push(
            fetchBasicEnergyFromSve(basicApiName)
              .then((d) => {
                card.image = d.images?.small ?? null;
                card.setCode = d.set?.ptcgoCode ?? card.setCode;
                card.number = d.number;
                card.setId = d.set?.id ?? null;
                card.supertype = 'Energy';
                card.isBasicEnergy = true;
                card.isAceSpec = false;
                card.types = d.types ?? null;
                card.subtypes = d.subtypes ?? [];
                card.evolvesFrom = d.evolvesFrom ?? null;
                card.regulationMark = d.regulationMark ?? null;
                card.isRotating = false;
                card.notLegalUntil = null;
                card.cardLoading = false;
              })
              .catch((e) => {
                card.cardError = e.message;
                card.cardLoading = false;
              })
          );
          continue;
        }

        promises.push(
          resolveCard(card.setCode, card.number, setMap, card.name)
            .then(async (data) => {
              let d = data;
              const isNonBasicNonPokemon =
                data.supertype === 'Trainer' ||
                (data.supertype === 'Energy' && !(data.subtypes ?? []).includes('Basic'));
              if (isNonBasicNonPokemon) {
                try {
                  d = await fetchNewestLegalPrint(data.name, LEGAL_REGULATION_MARKS);
                  card.setCode = d.set?.ptcgoCode ?? card.setCode;
                  card.number = d.number;
                } catch {
                  d = data; // no legal reprint — keep original
                }
              }
              card.image = d.images?.small || null;
              card.setId = d.set?.id ?? null;
              card.supertype = d.supertype ?? null;
              card.isBasicEnergy = card.isBasicEnergy || (d.supertype === 'Energy' && (d.subtypes ?? []).includes('Basic'));
              card.isAceSpec = (d.subtypes ?? []).includes('ACE SPEC');
              card.types = d.types ?? null;
              card.subtypes = d.subtypes ?? [];
              card.evolvesFrom = d.evolvesFrom ?? null;
              const mark = d.regulationMark ?? null;
              card.regulationMark = mark;
              card.isRotating = !card.isBasicEnergy && !LEGAL_REGULATION_MARKS.includes(mark);
              card.cardLoading = false;
              // Computed after setId is finalized, so it reflects the print actually used
              // (Trainer/Energy may have swapped to a newer legal reprint above).
              await refineLegality(card);
            })
            .catch((e) => {
              card.cardError = e.message;
              card.cardLoading = false;
            })
        );
      }
    }

    await Promise.all(promises);
    sortDeck(deck);
    loading = false;
  }

  function incrementCard(card) {
    card.qty++;
  }

  function decrementCard(card) {
    if (card.qty > 0) card.qty--;
  }

  function getWarnings() {
    if (!deck) return new Map();

    // Count qty by name (skip error/loading cards)
    const byName = new Map();
    for (const section of deck.sections) {
      for (const card of section.cards) {
        if (card.error || card.cardLoading) continue;
        byName.set(card.name, (byName.get(card.name) ?? 0) + card.qty);
      }
    }

    // Count ace specs
    let aceSpecTotal = 0;
    for (const section of deck.sections) {
      for (const card of section.cards) {
        if (card.isAceSpec) aceSpecTotal += card.qty;
      }
    }

    const warnings = new Map();
    for (const section of deck.sections) {
      for (const card of section.cards) {
        if (card.error || card.isBasicEnergy) continue;
        if (card.isAceSpec && aceSpecTotal > 1) {
          warnings.set(card.name, `Only 1 Ace Spec allowed (you have ${aceSpecTotal})`);
        } else if (!card.isAceSpec) {
          const total = byName.get(card.name) ?? 0;
          if (total > 4) {
            warnings.set(card.name, `Max 4 copies of "${card.name}" (you have ${total})`);
          }
        }
      }
    }
    return warnings;
  }

  function exportDeck() {
    if (!deck) return '';
    const lines = [];
    for (const section of deck.sections) {
      const liveCount = section.cards
        .filter(c => !c.error && c.qty > 0)
        .reduce((sum, c) => sum + c.qty, 0);
      if (liveCount === 0) continue;
      lines.push(`${section.name}: ${liveCount}`);
      for (const card of section.cards) {
        if (!card.error && card.qty === 0) continue;
        if (card.error && !card.setCode) continue;
        lines.push(`${card.qty} ${card.name} ${card.setCode} ${card.number}`);
      }
      lines.push('');
    }
    const total = deck.sections.reduce((sum, s) =>
      sum + s.cards.filter(c => !c.error).reduce((cs, c) => cs + c.qty, 0), 0);
    lines.push(`Total Cards: ${total}`);
    return lines.join('\n');
  }

  function addCard(apiCard) {
    if (!deck) return;
    const supertypeMap = { 'Pokémon': 'Pokémon', 'Trainer': 'Trainer', 'Energy': 'Energy' };
    const sectionName = supertypeMap[apiCard.supertype] ?? 'Trainer';

    // Re-read the section through `deck` after any insert so it's the reactive $state
    // proxy (a freshly-created section object is raw); otherwise the proxy read-back
    // below — and refineLegality's async mutation — would not be reactive (#20).
    let sectionIdx = deck.sections.findIndex(s => s.name === sectionName);
    if (sectionIdx === -1) {
      deck.sections.push({ name: sectionName, cards: [] });
      sectionIdx = deck.sections.length - 1;
    }
    const section = deck.sections[sectionIdx];

    const resolvedSetCode = apiCard.set?.ptcgoCode ?? getPtcgoCode(apiCard.set?.id) ?? '';

    // Increment existing print if already present
    const existing = section.cards.find(
      c => c.setCode === resolvedSetCode && c.number === apiCard.number
    );
    if (existing) {
      existing.qty++;
      return;
    }

    const mark = apiCard.regulationMark ?? null;
    const isBasicEnergy = apiCard.supertype === 'Energy' && (apiCard.subtypes ?? []).includes('Basic');
    const newCard = {
      qty: 1,
      name: apiCard.name,
      setCode: resolvedSetCode,
      number: apiCard.number,
      image: apiCard.images?.small ?? null,
      setId: apiCard.set?.id ?? null,
      supertype: apiCard.supertype ?? null,
      cardLoading: false,
      cardError: null,
      isBasicEnergy,
      isAceSpec: (apiCard.subtypes ?? []).includes('ACE SPEC'),
      types: apiCard.types ?? null,
      subtypes: apiCard.subtypes ?? [],
      evolvesFrom: apiCard.evolvesFrom ?? null,
      regulationMark: mark,
      isRotating: !isBasicEnergy && !LEGAL_REGULATION_MARKS.includes(mark),
      notLegalUntil: isBasicEnergy ? null : legalityFor(apiCard.set?.id ?? null),
    };
    section.cards.push(newCard);
    // Refine on the reactive $state proxy (read back from the array), not the raw
    // `newCard` reference — mutating the raw object inside the async refineLegality
    // would not trigger a re-render, leaving the conservative notice stuck on (#20).
    refineLegality(section.cards[section.cards.length - 1]);
    sortDeck(deck);
  }

  function removeCard(card) {
    if (!deck) return;
    for (const section of deck.sections) {
      const idx = section.cards.indexOf(card);
      if (idx !== -1) {
        section.cards.splice(idx, 1);
        break;
      }
    }
  }

  function reset() {
    deck = null;
    loading = false;
    error = null;
  }

  function applyPrintPicker(cardName, prints) {
    // prints: [{ setCode, number, qty, image, isBasicEnergy, isAceSpec }]
    if (!deck) return;
    for (const section of deck.sections) {
      const idx = section.cards.findIndex(c => c.name === cardName);
      if (idx === -1) continue;
      // All prints of the same name share supertype/types/subtypes — capture before removal.
      const source = section.cards[idx];
      const supertype = source.supertype ?? null;
      const types = source.types ?? null;
      const subtypes = source.subtypes ?? [];
      const evolvesFrom = source.evolvesFrom ?? null;
      // Remove all cards with this name
      section.cards = section.cards.filter(c => c.name !== cardName);
      // Re-insert prints with qty > 0 at the original position
      const newCards = prints
        .filter(p => p.qty > 0)
        .map(p => ({
          qty: p.qty,
          name: cardName,
          setCode: p.setCode,
          number: p.number,
          image: p.image,
          setId: p.setId ?? null,
          supertype,
          cardLoading: false,
          cardError: null,
          isBasicEnergy: p.isBasicEnergy ?? false,
          isAceSpec: p.isAceSpec ?? false,
          types,
          subtypes,
          evolvesFrom,
          regulationMark: p.regulationMark ?? null,
          isRotating: !(p.isBasicEnergy ?? false) && !LEGAL_REGULATION_MARKS.includes(p.regulationMark ?? null),
          notLegalUntil: (p.isBasicEnergy ?? false) ? null : legalityFor(p.setId ?? null),
        }));
      section.cards.splice(idx, 0, ...newCards);
      // Refine on the reactive proxies (by index), not the raw `newCards` refs — see #20.
      for (let i = 0; i < newCards.length; i++) refineLegality(section.cards[idx + i]);
      break;
    }
    sortDeck(deck);
  }

  return {
    get deck() { return deck; },
    get loading() { return loading; },
    get error() { return error; },
    get deckTotal() {
      if (!deck) return 0;
      return deck.sections.reduce((sum, s) =>
        sum + s.cards.filter(c => !c.error).reduce((cs, c) => cs + c.qty, 0), 0);
    },
    loadDeck,
    exportDeck,
    reset,
    incrementCard,
    decrementCard,
    addCard,
    removeCard,
    getWarnings,
    applyPrintPicker,
  };
}
