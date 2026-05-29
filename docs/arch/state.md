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
  → Promise.all(per-card resolution)
      Basic {X} Energy lines → fetchBasicEnergyFromSve(name) (snapshot SVE)
      everything else        → resolveDeckCard(card, section, setMap)
      each card: updates image, setId, isBasicEnergy, isAceSpec, regulationMark,
                 isRotating, notLegalUntil, cardLoading:false
```

Cards render progressively as each fetch resolves (skeleton → image).

### `resolveDeckCard(card, section, setMap)`

Trainers and special Energy are always normalised to the **newest legal print by
name** (`fetchNewestLegalPrint`), so the exact printed set/number in the deck text is
irrelevant for them. To avoid a slow live `GET /v2/cards/{id}` for old prints that
miss the snapshot, cards in the **Trainer** section resolve straight from
`fetchNewestLegalPrint` (snapshot-backed) and skip the exact-print fetch entirely. A
Trainer with no legal reprint (genuinely rotated out) falls back to `resolveCard` for
the exact print and is flagged `isRotating`.

The **Energy** section stays on the `resolveCard`-then-normalise path: it also holds
plain-named basic energies (e.g. `Grass Energy SVE 1`) that must resolve to their
actual print rather than be looked up by name; special energy is normalised after the
fetch. Pokémon (and unlabelled-section cards) likewise use `resolveCard`, keeping
their exact print — only Trainer/special-Energy supertypes get normalised.

## Set-legality annotation (`notLegalUntil`)

A set is only tournament-legal ~2 weeks after release (Handbook §4.1.2), but the API marks
its cards Standard-legal at print time. `src/data/set-legality.json` (keyed by API `setId`)
records the real `releaseDate` and `legalFrom` per set. `card.notLegalUntil` holds the date
the card becomes legal when that date is still in the future, else `null`. `CardTile`
renders it as an amber **informational** notice (`Legal from {date}`), distinct from the red
error styling — the card is valid, just early.

It is set in two stages by every card-creation path (`loadDeck` general branch, `addCard`,
`applyPrintPicker`):

1. **Conservative (sync):** `legalityFor(setId)` → `notLegalUntil(setLegality[setId], todayIso())`
   from [`legality.js`](../../src/lib/legality.js). Returns `legalFrom` if it's after today,
   else `null`. Treats the card as brand-new (warns).
2. **Refined (async):** `refineLegality(card)` applies the **reprint rule** (Handbook §4.1.3):
   a card from a not-yet-legal set is legal from the set's **`releaseDate`** (not the later
   `legalFrom`) when it is a *functionally-identical reprint* of a card whose set is already
   legal. It fetches all prints of the card's name (`fetchPrintsByName`), keeps those from a
   currently-legal set (`isSetLegalOn`) with a legal regulation mark, and compares them to the
   card's own print via [`isFunctionalReprint`](../../src/lib/reprint.js) (HP + attacks +
   abilities). If a match is found, `notLegalUntil(entry, today, { isReprint: true })` uses the
   release date — so released reprints clear the notice. On any lookup failure it keeps the
   conservative value. `loadDeck` awaits this; `addCard`/`applyPrintPicker` fire it and let
   the reactive card update.

   > **Reactivity:** the async refinement must run against the **`$state` proxy**, not the
   > raw card object. `addCard`/`applyPrintPicker` therefore read the card back out of
   > `deck.sections[…].cards[…]` (and `addCard` re-reads a freshly-created section through
   > `deck.sections[idx]`) before calling `refineLegality`. Mutating the raw object that was
   > pushed/spliced in would not trigger a re-render, leaving the conservative notice stuck on
   > (issue #20). `loadDeck` is already safe because it iterates the proxied array.

Notes:
- Computed **after** `setId` is finalized, so it reflects the print actually used (the
  Trainer/Energy reprint swap in `loadDeck` may change `setId` to a newer, not-yet-legal set).
- Basic energy is always `null` (basics never rotate or wait for legality). Every path
  enforces this: the sync construction in `addCard`/`applyPrintPicker` short-circuits on the
  `isBasicEnergy` flag, and `refineLegality` early-returns `null` for basic energy — so a
  basic-energy print from a tracked not-yet-legal set never shows the notice.
- The static `set-legality.json` import is **not** gated by `VITE_DISABLE_SNAPSHOT`, so the
  base annotation works even when the card snapshot is disabled (e.g. in tests). The reprint
  refinement relies on `fetchPrintsByName`, which uses the snapshot in production and the
  mocked network in tests.

## `getWarnings()` rules

- Basic Energy cards are excluded from all warnings. PTCGL `Basic {X} Energy` lines are detected by name pattern at parse time (`isBasicEnergy = true`) and resolved directly via `fetchBasicEnergyFromSve()` using a curly-brace symbol → API name map (`{G}` → Grass Energy, etc.) — bypassing the normal `setCode`/`number` lookup, since PTCGL set codes like `MEE` don't correspond to a fetchable API card. The name regex (`BASIC_ENERGY_NAME_RE`) and letter→name map (`BASIC_ENERGY_API_NAMES`) live in [`energy.js`](../../src/lib/energy.js). SVE energies are named with a `"Basic "` prefix in both the snapshot and the API, so `getSnapshotBasicEnergy` matches via `matchesBasicEnergyName` (strips the prefix) — otherwise every basic energy would miss the snapshot and make a slow live API call.
- Non-ACE SPEC card with total qty by name > 4 → `"Max 4 copies of {name} (you have {n})"`
- ACE SPEC cards with total ACE SPEC qty > 1 → `"Only 1 Ace Spec allowed (you have {n})"`
