# Component Interfaces

## `App.svelte`

Top-level flow controller. Three render states:
- `DeckInput` — empty state (no deck loaded)
- `DeckView` + `ExportButton` — deck loaded
- Error banner — top-level fetch failure

Also manages `PrintPicker` visibility.

**Internal state:**
- `deckState` — result of `createDeck()` (see [state.md](state.md))
- `pickerCard: { name, setCode, number } | null` — which card's Print Picker is open; `null` = closed

**Key function:** `getPickerDeckCards(cardName)` — collects `[{ setCode, number, qty }]` for all deck entries with that name (feeds `initialPrints` into PrintPicker, including entries at qty=0).

---

## `DeckInput.svelte`

**Props:** `{ onload: (text: string) → void }`

Textarea with placeholder + "Load Deck" button. Button disabled when textarea is empty.

---

## `DeckView.svelte`

**Props:** `{ sections, onincrement, ondecrement, warnings: Map<name, string>, onpick: fn|null }`

Renders one `<section>` per deck section with a header (`name (count)`) and a CSS grid of `CardTile` components. Passes `onpick` only to Pokémon section tiles (`section.name === 'Pokémon'`); Trainer/Energy tiles receive `onpick={null}` (not clickable).

Visible cards: `section.cards.filter(c => c.qty > 0 || c.error)` — zero-qty cards are hidden but not removed.

---

## `CardTile.svelte`

**Props:** `{ card, onincrement, ondecrement, warning: string|null, onpick: fn|null }`

Three render states:
1. **Loading** (`card.cardLoading`) — skeleton placeholder with pulse animation, aspect ratio 245/342
2. **Error** (`card.cardError`) — warning icon + card name text on skeleton background
3. **Loaded** — card image, qty badge (top-left overlay), +/− buttons below, optional warning text

When `onpick` is provided, the image is wrapped in `<button class="pick-trigger">` calling `onpick(card)`. Otherwise a plain `<img>`. DeckView controls which cards get `onpick`.

**data-testid attributes:** `card-tile`, `increment`, `decrement`

---

## `PrintPicker.svelte`

**Props:** `{ cardName, clickedSetCode, clickedNumber, initialPrints, onclose }`

- `initialPrints`: `[{ setCode, number, qty }]` — current deck quantities per print of this card name
- `clickedSetCode` / `clickedNumber` — which print was clicked (highlighted with `.current` class)
- `onclose(prints)` — called with the picker's full print array on Done; called with `null` on Cancel/backdrop click

**On mount:** calls `fetchPrintsByName(cardName)`, merges with `initialPrints` to build local `pickerPrints` state. Each entry: `{ setCode, number, setName, image, legalities, isBasicEnergy, isAceSpec, qty }`.

**Validation on Done:** total qty across all prints > 4 (and no print `isBasicEnergy`) → shows `data-testid="picker-error"`, blocks close.

**Layout:** fixed panel, right rail on desktop (`width: min(420px, 100vw)`, `height: 100dvh`), bottom sheet on mobile (`@media max-width: 600px`, `height: 80dvh`, rounded top corners). Backdrop covers the rest of the screen; clicking it cancels.

**data-testid attributes:** `print-picker`, `print-option` (one `<li>` per print), `print-increment`, `print-decrement`, `print-qty`, `picker-error`

**`.current` class:** applied to the `print-option` whose `setCode + number` matches `clickedSetCode + clickedNumber`.

---

## `ExportButton.svelte`

**Props:** `{ onexport: () → string }`

Button labelled "Export Decklist". On click: calls `onexport()`, copies result to clipboard via `navigator.clipboard.writeText()`. Shows "Copied!" for 2 seconds then reverts.

---

## `parser.js` — `parseDeck(text)`

`parseDeck(text) → { sections: Section[], totalCount: number }`

Section header regex: `/^(Pokémon|Pokemon|Trainer|Energy)\s*:\s*(\d+)/i`

Card line regex: `/^(\d+)\s+(.+?)\s+([A-Za-z]{2,6})\s+(\d+)\s*$/` → `{ qty, name, setCode, number }`

Unrecognized lines produce a card stub with `error: true` (rendered with warning icon, skipped in API fetches and export).
