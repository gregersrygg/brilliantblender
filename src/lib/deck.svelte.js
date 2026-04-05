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
          resolveCard(card.setCode, card.number, setMap)
            .then((data) => {
              card.image = data.images?.small || null;
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

  function exportDeck() {
    if (!deck) return '';
    const lines = [];
    for (const section of deck.sections) {
      lines.push(`${section.name}: ${section.count}`);
      for (const card of section.cards) {
        if (card.error && !card.setCode) continue;
        lines.push(`${card.qty} ${card.name} ${card.setCode} ${card.number}`);
      }
      lines.push('');
    }
    lines.push(`Total Cards: ${deck.totalCount}`);
    return lines.join('\n');
  }

  function reset() {
    deck = null;
    loading = false;
    error = null;
  }

  return {
    get deck() { return deck; },
    get loading() { return loading; },
    get error() { return error; },
    loadDeck,
    exportDeck,
    reset,
  };
}
