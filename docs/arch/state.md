# State Management — `createDeck()` (`src/lib/deck.svelte.js`)

Svelte 5 runes pattern. `createDeck()` returns a reactive object. Instantiated once in `App.svelte` as `const deckState = createDeck()`.

## Reactive state

| Property | Type | Description |
|---|---|---|
| `deck` | `object\|null` | The loaded deck (sections + cards) |
| `loading` | `boolean` | True while initial card fetches are in flight |
| `error` | `string\|null` | Top-level error (e.g. failed to fetch sets) |
| `deckTotal` | `number` | Computed: sum of all non-error card quantities |

## Methods

| Method | Signature | Description |
|---|---|---|
| `loadDeck` | `(text: string) → Promise<void>` | Parse text, fetch sets, fetch all cards in parallel |
| `incrementCard` | `(card) → void` | `card.qty++` |
| `decrementCard` | `(card) → void` | `card.qty--` (min 0) |
| `exportDeck` | `() → string` | Serialize to PTCGL text format |
| `getWarnings` | `() → Map<name, message>` | Returns rule violations: >4 copies, >1 ACE SPEC |
| `removeCard` | `(card) → void` | Remove a specific card object from its section (used for error cards) |
| `applyPrintPicker` | `(cardName, prints) → void` | Replace all cards with that name (see below) |
| `reset` | `() → void` | Clear all state |

## `applyPrintPicker(cardName, prints)`

`prints` is an array of `{ setCode, number, qty, image, isBasicEnergy, isAceSpec }`.

Finds the section containing `cardName`, removes all cards with that name, then splices in new card objects (one per print where `qty > 0`) at the original position. Used by `PrintPicker` on Done.

## Loading flow

```
loadDeck(text)
  → parseDeck(text)           sets deck with cardLoading:true on each card
  → fetchSets()               builds ptcgoCode→setId map
  → Promise.all(resolveCard per card)
      each card: updates image, isBasicEnergy, isAceSpec, cardLoading:false
```

Cards render progressively as each fetch resolves (skeleton → image).

## `getWarnings()` rules

- Basic Energy cards are excluded from all warnings. PTCGL `Basic {X} Energy` lines are detected by name pattern at parse time (`isBasicEnergy = true`) and resolved directly via `fetchBasicEnergyFromSve()` using a curly-brace symbol → API name map (`{G}` → Grass Energy, etc.) — bypassing the normal `setCode`/`number` lookup, since PTCGL set codes like `MEE` don't correspond to a fetchable API card.
- Non-ACE SPEC card with total qty by name > 4 → `"Max 4 copies of {name} (you have {n})"`
- ACE SPEC cards with total ACE SPEC qty > 1 → `"Only 1 Ace Spec allowed (you have {n})"`
