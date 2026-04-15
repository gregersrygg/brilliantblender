// src/lib/deck.svelte.js
import { parseDeck } from './parser.js';
import { fetchSets, resolveCard, fetchNewestLegalPrint, fetchBasicEnergyFromSve, getPtcgoCode } from './api.js';
import { LEGAL_REGULATION_MARKS } from './config.js';

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
                card.regulationMark = d.regulationMark ?? null;
                card.isRotating = false;
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
              const mark = d.regulationMark ?? null;
              card.regulationMark = mark;
              card.isRotating = mark !== null && !LEGAL_REGULATION_MARKS.includes(mark);
              card.cardLoading = false;
            })
            .catch((e) => {
              card.cardError = e.message;
              card.cardLoading = false;
            })
        );
      }
    }

    await Promise.all(promises);
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

    let section = deck.sections.find(s => s.name === sectionName);
    if (!section) {
      section = { name: sectionName, cards: [] };
      deck.sections.push(section);
    }

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
    section.cards.push({
      qty: 1,
      name: apiCard.name,
      setCode: resolvedSetCode,
      number: apiCard.number,
      image: apiCard.images?.small ?? null,
      setId: apiCard.set?.id ?? null,
      supertype: apiCard.supertype ?? null,
      cardLoading: false,
      cardError: null,
      isBasicEnergy: apiCard.supertype === 'Energy' && (apiCard.subtypes ?? []).includes('Basic'),
      isAceSpec: (apiCard.subtypes ?? []).includes('ACE SPEC'),
      regulationMark: mark,
      isRotating: mark !== null && !LEGAL_REGULATION_MARKS.includes(mark),
    });
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
          cardLoading: false,
          cardError: null,
          isBasicEnergy: p.isBasicEnergy ?? false,
          isAceSpec: p.isAceSpec ?? false,
          regulationMark: p.regulationMark ?? null,
          isRotating: p.regulationMark ? !LEGAL_REGULATION_MARKS.includes(p.regulationMark) : false,
        }));
      section.cards.splice(idx, 0, ...newCards);
      break;
    }
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
