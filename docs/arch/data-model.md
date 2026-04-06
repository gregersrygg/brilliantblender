# Data Model

## Card object

Each card in the deck has this shape (after loading):

```javascript
{
  qty: number,           // current quantity (reactive, edited by user)
  name: string,          // e.g. "Dragapult ex"
  setCode: string,       // ptcgoCode e.g. "TWM"
  number: string,        // card number e.g. "130"
  image: string|null,    // small image URL from API (null while loading)
  cardLoading: boolean,  // true while API fetch is in flight
  cardError: string|null,// error message if fetch failed
  isBasicEnergy: boolean,// true for Basic Energy cards (no 4-copy limit)
  isAceSpec: boolean,    // true for ACE SPEC cards (max 1 per deck)
}
```

Cards with `cardError` set still live in the deck array (shown with a warning icon, no image).

## Deck object

```javascript
{
  sections: [
    {
      name: "Pokémon",   // or "Trainer" or "Energy"
      cards: Card[],     // includes cards at qty=0 (hidden in UI but preserved)
    },
    ...
  ]
}
```

Cards at `qty === 0` are **not removed** from `section.cards` — they're filtered in `DeckView` for display. This preserves their position in the list.

The deck can contain **multiple card objects with the same `name`** (different prints after M3 print substitution). `getWarnings()` sums quantities by name across all entries.

## API card object shape

Fields from pokemontcg.io used in the app:

```javascript
{
  id: "sv6-130",
  name: "Dragapult ex",
  number: "130",
  supertype: "Pokémon",           // "Pokémon" | "Trainer" | "Energy"
  subtypes: ["Stage 2", "ex"],    // includes "ACE SPEC", "Basic"
  set: {
    id: "sv6",
    ptcgoCode: "TWM",
    name: "Twilight Masquerade",
  },
  images: { small: "https://...", large: "https://..." },
  legalities: {
    standard: "legal",            // "legal" | "banned" | undefined
    expanded: "legal",
    unlimited: "legal",
  },
}
```
