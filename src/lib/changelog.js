// User-facing changelog shown on the landing page.
// Newest first. Keep entries short and player-focused — no internal/CI churn.
// When you ship something a user would notice, add an entry here.

export const CHANGELOG = [
  {
    date: '2026-05-30',
    items: [
      'On mobile, tapping the search box or decklist no longer zooms the page in — pinch-to-zoom still works.',
    ],
  },
  {
    date: '2026-05-29',
    items: [
      'Heads-up when a card belongs to a set that isn’t tournament-legal yet.',
      'Reprint rule (§4.1.3) is applied automatically when you add or swap a print.',
      'Older Trainer cards and gold (special) Energy now load straight from the bundled card data.',
    ],
  },
  {
    date: '2026-05-21',
    items: [
      'Share a deck with a link — decks can load from a #deck= URL.',
    ],
  },
  {
    date: '2026-05-20',
    items: [
      'Start from an empty deck and build from scratch.',
      'Card search now ignores accents, so "Pokemon" finds "Pokémon".',
    ],
  },
  {
    date: '2026-04-19',
    items: [
      'Instant print lookup and fuzzy card search powered by bundled card data — no waiting on the network.',
      'Standard-legal cards load offline, so decks appear the moment you paste them.',
    ],
  },
  {
    date: '2026-04-15',
    items: [
      'Decks auto-sort by type, evolution chain, and subtype.',
      'Basic Energy lines (e.g. "Basic Psychic Energy") resolve correctly.',
    ],
  },
];
