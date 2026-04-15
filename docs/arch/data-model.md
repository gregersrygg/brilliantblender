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
  setId: string|null,    // API set id e.g. "sv6" (null while loading; used for robust print matching)
  cardLoading: boolean,  // true while API fetch is in flight
  cardError: string|null,// error message if fetch failed
  isBasicEnergy: boolean,// true for Basic Energy cards (no 4-copy limit)
  isAceSpec: boolean,    // true for ACE SPEC cards (max 1 per deck)
  supertype: string|null,// "Pokémon" | "Trainer" | "Energy" (null while loading)
  types: string[]|null,  // Pokémon energy types e.g. ["Fire"]; used for sort
  subtypes: string[],    // API subtypes e.g. ["Stage 2","ex"] / ["Item"] / ["Supporter"] / ["Pokémon Tool"] / ["Stadium"] / ["Basic"] / ["Special"]; used for sort
  evolvesFrom: string|null, // Parent Pokémon name (e.g. "Dreepy" for Drakloak); used to group evolution chains
  regulationMark: string|null,
  isRotating: boolean,   // regulation mark not in LEGAL_REGULATION_MARKS
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

## Sort order

`src/lib/sort.js` exports `sortDeck(deck)`. Called:
1. Immediately after parse (before any API fetch) — gives alpha-by-name stability while loading.
2. After all cards resolve in `loadDeck` — final order with full type/stage data.
3. After `addCard` and `applyPrintPicker`.

`incrementCard` / `decrementCard` / `removeCard` don't re-sort — qty and removal don't affect order.

- **Pokémon**: `[typeIndex, evolutionRoot, stage, name, setId, number]`.
  - **Type** in color-wheel order: Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, Fairy, Dragon, Colorless.
  - **Evolution root**: walk `evolvesFrom` within the deck back to a Basic (or to a parent name that isn't in the deck, for Rare-Candy lines). Groups a Basic with its evolutions and keeps reprints of the same stage adjacent.
  - Type is the primary key, so a multi-type evolution family (e.g. Eevee + Jolteon + Vaporeon) stays separated by type as the user sees it.
  - **Stage**: Basic (0) → Stage 1 (1) → Stage 2 (2) → other evolution forms (3).
- **Trainer**: by subtype group (Item → Supporter → Pokémon Tool → Stadium) found in `subtypes`, then `name` A→Z.
- **Energy**: special first (A→Z), then basic (A→Z). Uses `isBasicEnergy` flag.
- **Still-loading** cards sort with the rest using whatever fields they have (at minimum `name`) — the comparator falls back to alphabetical when type/stage/subtype data isn't yet populated.
- **Error** cards (`cardError` set) are kept at the end of their section in insertion order.

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
