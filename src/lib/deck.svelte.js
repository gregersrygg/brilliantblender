// src/lib/deck.svelte.js
import { parseDeck } from './parser.js';
import { fetchSets, resolveCard } from './api.js';

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
        promises.push(
          resolveCard(card.setCode, card.number, setMap, card.name)
            .then((data) => {
              card.image = data.images?.small || null;
              card.setId = data.set?.id ?? null;
              card.isBasicEnergy = data.supertype === 'Energy' && (data.subtypes ?? []).includes('Basic');
              card.isAceSpec = (data.subtypes ?? []).includes('ACE SPEC');
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
          cardLoading: false,
          cardError: null,
          isBasicEnergy: p.isBasicEnergy ?? false,
          isAceSpec: p.isAceSpec ?? false,
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
    removeCard,
    getWarnings,
    applyPrintPicker,
  };
}
