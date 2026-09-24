// User-facing changelog shown on the landing page.
// Newest first. Keep entries short and player-focused — no internal/CI churn.
// When you ship something a user would notice, add an entry here.

export const CHANGELOG = [
  {
    date: '2026-09-24',
    items: [
      'Card-text search now looks only at attacks and abilities — the rule box (e.g. an ex’s “when this Pokémon is Knocked Out…” text) no longer produces unexpected matches.',
    ],
  },
  {
    date: '2026-09-22',
    items: [
      'Basic energy lines now load instantly and reliably regardless of the set code you paste (e.g. "Grass Energy MEE 1") — they resolve from the bundled card list instead of a live lookup, so they no longer intermittently fail when the card API is flaky.',
      'Rebuilt card search into a proper faceted search. Beyond names, you can now filter by Pokémon type, attack cost, HP, retreat, weakness, trainer type, evolution stage, prizes (ex / Mega), and card text — and combine them.',
      'Filters you add become clean, removable chips — click one (or backspace into it) to edit it again, and there’s a live “</>” query line that mirrors them all. Click the ＋ (or just start typing, e.g. type:fire hp:200+) and learn the search shorthand as you go.',
      'Set and regulation-mark filters now autocomplete as you type, so you don’t have to remember set codes.',
      'Results now show the plain, functional printings by default — the alternate-art, full-art, and gold “chase” rarities are hidden unless you ask for them (add a Rarity filter, e.g. “All rarities”).',
      'Search now runs instantly offline against the bundled card list, so results appear as you type.',
    ],
  },
  {
    date: '2026-09-20',
    items: [
      'A set no longer disappears the day it releases — it now stays in the “New & upcoming sets” table through its release-to-legal window (with a “Released”, then “Legal”, status) until the next set’s Prerelease begins, so you can still see when it becomes tournament-legal.',
      'Fixed 30th Celebration’s legal date: it’s Sep 25, 2026 (confirmed by TPCi), not Sep 30. The set had been mis-detected as a regular set at release, so cards from it were flagged legal five days too late.',
    ],
  },
  {
    date: '2026-09-05',
    items: [
      'Corrected the provisional legal-to-play date for special sets: it’s now the second Friday following the Elite Trainer Box / Booster Bundle date (per Tournament Handbook §4.1.2), matching how judges read the rule. 30th Celebration now shows Sep 25, 2026 instead of Oct 2.',
    ],
  },
  {
    date: '2026-09-04',
    items: [
      'The “Upcoming sets” table can now show a legal-to-play date for special sets (like 30th Celebration) once their Elite Trainer Box date is known, instead of always showing “?”. It’s marked as provisional until confirmed.',
      'Deck lines with a set code that starts with a number — like 30th Celebration’s “30C” — now load properly instead of showing up as an unrecognized line.',
    ],
  },
  {
    date: '2026-06-14',
    items: [
      'On mobile, closing the keyboard no longer hides your card search results — and there’s now a ✕ button to clear the search.',
    ],
  },
  {
    date: '2026-06-12',
    items: [
      'Pasting a Pokémon from a set that isn’t out yet now shows the “coming soon” notice with its release date, instead of quietly swapping in a different printing of the same card.',
      'The “Upcoming sets” table now labels each value (Release / Legal / Status) on mobile, where the column headers were previously missing.',
    ],
  },
  {
    date: '2026-06-10',
    items: [
      'New “Upcoming sets” section on the home page shows announced sets with their release date and when they become legal to play (with a heads-up about the prerelease reprint rule, §4.1.3).',
      'Pasting a card from a set that isn’t out yet — or one that just released, before our card data catches up — now shows a clear “coming soon” card with its release and legal-to-play dates, instead of a generic error.',
    ],
  },
  {
    date: '2026-06-03',
    items: [
      'Card search results now show larger card images in a grid that fills the screen width, so cards are easier to read and pick.',
    ],
  },
  {
    date: '2026-06-02',
    items: [
      'New animated backdrop — a soft glow behind the logo with gently twinkling sparkles, replacing the plain background.',
      'The blender logo now spins for a few seconds when the page opens, a deck loads, or you start a new deck.',
    ],
  },
  {
    date: '2026-05-30',
    items: [
      'On mobile, tapping the search box or decklist no longer zooms the page in — pinch-to-zoom still works.',
      'Accidentally double-tapping the page on mobile no longer zooms in — pinch-to-zoom still works.',
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
