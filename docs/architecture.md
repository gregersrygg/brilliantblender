# Brilliant Blender — Architecture

This document is the primary reference for agents and contributors. It describes the file structure, data model, component interfaces, API layer, and test infrastructure in enough detail to work on any task without reading source code first.

**Keep this document up to date.** After completing any task or milestone, update the relevant sections to reflect changes.

---

## File Structure

```
src/
  main.js                  Entry point — mounts App.svelte
  app.css                  Global CSS variables and resets
  App.svelte               Top-level: flow control, picker state
  lib/
    parser.js              Pure function: PTCGL text → deck structure
    api.js                 API client: pokemontcg.io v2, sessionStorage cache
    deck.svelte.js         Svelte 5 reactive state manager (createDeck)
    DeckInput.svelte       Textarea + "Load Deck" button (empty state)
    DeckView.svelte        Section headers + card grid
    CardTile.svelte        Individual card: image, qty badge, +/− controls
    ExportButton.svelte    Copy-to-clipboard button
    PrintPicker.svelte     Slide-in panel: alternate prints, qty per print

tests/
  helpers.js               Shared mock API setup + SAMPLE_DECKLIST
  m1-paste-preview.spec.js M1 feature tests
  m2-quantity-editing.spec.js M2 feature tests
  m3-print-substitution.spec.js M3 feature tests
```

---

## Data Model

### Card object

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

### Deck object

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

---

## State Management — `createDeck()` (`src/lib/deck.svelte.js`)

Svelte 5 runes pattern. `createDeck()` returns a reactive object. Use it in `App.svelte` as `const deckState = createDeck()`.

### Reactive state

| Property | Type | Description |
|---|---|---|
| `deck` | `object\|null` | The loaded deck (sections + cards) |
| `loading` | `boolean` | True while initial card fetches are in flight |
| `error` | `string\|null` | Top-level error (e.g. failed to fetch sets) |
| `deckTotal` | `number` | Computed: sum of all non-error card quantities |

### Methods

| Method | Signature | Description |
|---|---|---|
| `loadDeck` | `(text: string) → Promise<void>` | Parse text, fetch sets, fetch all cards in parallel |
| `incrementCard` | `(card) → void` | `card.qty++` |
| `decrementCard` | `(card) → void` | `card.qty--` (min 0) |
| `exportDeck` | `() → string` | Serialize to PTCGL text format |
| `getWarnings` | `() → Map<name, message>` | Returns rule violations: >4 copies, >1 ACE SPEC |
| `applyPrintPicker` | `(cardName, prints) → void` | Replace all cards with that name; see below |
| `reset` | `() → void` | Clear all state |

### `applyPrintPicker(cardName, prints)`

`prints` is an array of `{ setCode, number, qty, image, isBasicEnergy, isAceSpec }`.

Finds the section containing `cardName`, removes all cards with that name, then splices in new card objects (one per print where `qty > 0`) at the original position. Used by `PrintPicker` on Done.

### Loading flow

```
loadDeck(text)
  → parseDeck(text)           sets deck with cardLoading:true on each card
  → fetchSets()               builds ptcgoCode→setId map
  → Promise.all(resolveCard per card)
      each card: updates image, isBasicEnergy, isAceSpec, cardLoading:false
```

Cards render progressively as each fetch resolves (skeleton → image).

---

## API Layer — `src/lib/api.js`

Base URL: `https://api.pokemontcg.io/v2`

All functions check sessionStorage before fetching and write results back.

### Cache keys

| Key pattern | Stores |
|---|---|
| `bb:sets` | `Array<[ptcgoCode, setId]>` (serialized Map entries) |
| `bb:card:{setId}-{number}` | Single card object |
| `bb:name:{name}` | First search result for a card name (fallback) |
| `bb:prints:{name}` | All prints array for a card name |

### Functions

#### `fetchSets() → Promise<Map<ptcgoCode, setId>>`

Fetches `GET /v2/sets?pageSize=250`. Returns a `Map` (e.g. `"TWM" → "sv6"`). Handles duplicate ptcgoCodes by preferring the shorter setId.

#### `fetchCard(setId, number) → Promise<cardObject>`

Fetches `GET /v2/cards/{setId}-{number}`.

#### `searchCardByName(name) → Promise<cardObject>`

Fetches `GET /v2/cards?q=name:"{name}"&pageSize=1`. Returns first result.

#### `resolveCard(ptcgoCode, number, setMap, name) → Promise<cardObject>`

Main entry point for loading deck cards. Tries `ptcgoCode → setId → fetchCard`, falls back to `searchCardByName(name)` if set lookup or card fetch fails.

#### `fetchPrintsByName(name) → Promise<cardObject[]>`

Fetches `GET /v2/cards?q=name:"{name}"&orderBy=set.releaseDate&pageSize=250`. Returns all English prints of a card, sorted oldest→newest. Used by `PrintPicker`.

### Card object shape (from API)

Relevant fields used in the app:

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

---

## Component Interfaces

### `App.svelte`

Top-level flow controller. Three render states: `DeckInput` (empty) → `DeckView + ExportButton` (loaded) → error banner. Also manages `pickerCard` state to show/hide `PrintPicker`.

**Internal state:**
- `deckState` — result of `createDeck()`
- `pickerCard: { name, setCode, number } | null` — which card's Print Picker is open

**Key function:** `getPickerDeckCards(cardName)` — returns `[{ setCode, number, qty }]` for all deck entries with that name (feeds initial qtys into PrintPicker).

---

### `DeckInput.svelte`

Props: `{ onload: (text: string) → void }`

Textarea + "Load Deck" button. Button disabled when empty.

---

### `DeckView.svelte`

Props: `{ sections, onincrement, ondecrement, warnings: Map, onpick: fn|null }`

Renders one `<section>` per deck section, each with a header (name + count) and a CSS grid of `CardTile` components. Passes `onpick` only to Pokémon section tiles (`section.name === 'Pokémon'`); Trainer/Energy tiles get `onpick={null}` (not clickable).

---

### `CardTile.svelte`

Props: `{ card, onincrement, ondecrement, warning: string|null, onpick: fn|null }`

Three render states:
1. **Loading** — skeleton placeholder (pulse animation)
2. **Error** — warning icon + card name text
3. **Loaded** — card image, qty badge, +/− buttons, optional warning text

When `onpick` is provided, the image is wrapped in a `<button class="pick-trigger">` that calls `onpick(card)` on click. This only happens for Pokémon cards (DeckView controls this by passing `onpick` conditionally).

**data-testid attributes:** `card-tile`, `increment`, `decrement`

---

### `PrintPicker.svelte`

Props: `{ cardName, clickedSetCode, clickedNumber, initialPrints, onclose }`

- `initialPrints`: `[{ setCode, number, qty }]` — current deck quantities for this card name
- `onclose(prints | null)` — called with the picker's print array on Done, or `null` on Cancel

On mount: calls `fetchPrintsByName(cardName)`, merges with `initialPrints` to build local `pickerPrints` state.

**Validation on Done:** if total qty across all prints > 4 (and no print is Basic Energy), shows error and blocks close.

**Slide-in panel:** fixed right rail on desktop (`width: min(420px, 100vw)`), bottom sheet on mobile (`@media max-width: 600px`).

**data-testid attributes:** `print-picker`, `print-option` (one per print, `.current` class on clicked print), `print-increment`, `print-decrement`, `print-qty`, `picker-error`

---

### `ExportButton.svelte`

Props: `{ onexport: () → string }`

Calls `onexport()`, copies result to clipboard via `navigator.clipboard.writeText()`. Shows "Copied!" feedback for 2 seconds.

---

## Parser — `src/lib/parser.js`

`parseDeck(text) → { sections: [...], totalCount: number }`

Parses PTCGL text format. Section headers matched by `/^(Pokémon|Pokemon|Trainer|Energy)\s*:\s*(\d+)/i`. Card lines matched by `/^(\d+)\s+(.+?)\s+([A-Za-z]{2,6})\s+(\d+)\s*$/` extracting `qty`, `name`, `setCode`, `number`. Unrecognized lines produce a card object with `error: true`.

---

## Test Infrastructure — `tests/helpers.js`

### `SAMPLE_DECKLIST`

A 4-card deck used in most tests:
```
1 Dragapult ex TWM 130   (Pokémon)
1 Dreepy TWM 128          (Pokémon)
1 Buddy-Buddy Poffin TEF 144  (Trainer)
1 Grass Energy SVE 1     (Energy)
Total Cards: 4
```

### `mockApi(page)`

Registers two Playwright routes:
- `**/v2/sets*` → returns `MOCK_SETS` (TWM, TEF, SVE set IDs)
- `**/v2/cards/*` → returns `MOCK_CARDS[cardId]` or 404

Must be called before `page.goto('/')`.

### `mockPrints(page)`

Registers: `**/v2/cards?*` → parses `q=name:"..."`, returns matching entries from `MOCK_PRINTS_BY_NAME` or `[]`.

Mock prints exist for: `"Dragapult ex"` (two prints: TWM 130 and TWM 215).

Call in addition to `mockApi` for M3 tests.

### Mock data constants

| Constant | Contains |
|---|---|
| `MOCK_SETS` | TWM (`sv6`), TEF (`sv5`), SVE (`sve`) |
| `MOCK_CARDS` | sv6-130, sv6-128, sv5-144, sve-1 |
| `MOCK_PRINTS_BY_NAME` | `"Dragapult ex"` → [sv6-130, sv6-215] |

---

## CSS Variables (from `src/app.css`)

| Variable | Usage |
|---|---|
| `--bg` | Background colour |
| `--text` | Body text |
| `--text-h` | Heading / bold text |
| `--border` | Border colour |
| `--accent` | Primary action colour (buttons, highlights) |
| `--error` | Red for errors and warnings |
| `--skeleton` | Background for loading placeholders |

Light and dark mode both defined; dark mode via `@media (prefers-color-scheme: dark)`.

---

## Milestone Status

| Milestone | Status |
|---|---|
| M1: Paste & Preview | ✅ Complete |
| M2: Quantity Editing | ✅ Complete |
| M3: Print Substitution | ✅ Complete |
| M4: Polish & Deploy | ⬜ Not started |
