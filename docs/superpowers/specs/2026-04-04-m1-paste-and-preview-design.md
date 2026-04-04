# M1 — Paste & Preview Design Spec

## Context

Brilliant Blender is a client-side Pokémon TCG decklist editor. M1 delivers the first vertical slice: paste a PTCGL-format decklist, see card images in a grid, and export the decklist back to text. This establishes the parser, API layer, and component structure that M2–M4 build on.

## Architecture

Four layers, logic separated from UI:

1. **`src/lib/parser.js`** — Pure function: text in, structured data out
2. **`src/lib/api.js`** — Set-list fetching, ptcgoCode→setId mapping, card fetching, sessionStorage caching
3. **`src/lib/deck.svelte.js`** — Svelte 5 reactive state module ($state runes). Holds parsed deck + card data, orchestrates parsing and fetching
4. **Components** — Thin UI layers: `App.svelte`, `DeckInput.svelte`, `DeckView.svelte`, `CardTile.svelte`, `ExportButton.svelte`

## Parser — `src/lib/parser.js`

Pure function `parseDeck(text)`. Input: raw decklist text. Output:

```js
{
  sections: [
    { name: "Pokémon", count: 12, cards: [
      { qty: 4, name: "Gardevoir ex", setCode: "SVI", number: "86" },
      ...
    ]},
    { name: "Trainer", count: 38, cards: [...] },
    { name: "Energy", count: 10, cards: [...] }
  ],
  totalCount: 60
}
```

Rules:
- Section headers match pattern `Pokémon: N`, `Trainer: N`, `Energy: N` (the count after colon is informational, we recompute from card lines)
- Card lines match `{qty} {name} {setCode} {number}` — qty is a leading integer, number is a trailing token, setCode is the second-to-last token, name is everything in between
- `Total Cards: N` line is ignored
- Blank lines are ignored
- Lines that don't match any pattern are included in the current section with an `error: true` flag

## API Layer — `src/lib/api.js`

### `fetchSets()`
- `GET /v2/sets?pageSize=250`
- Caches full response in sessionStorage under key `bb:sets`
- Returns `Map<ptcgoCode, setId>` (e.g. `"SVI" → "sv1"`)

### `fetchCard(setId, number)`
- `GET /v2/cards/{setId}-{number}`
- Caches in sessionStorage under key `bb:card:{setId}-{number}`
- Returns the card object (name, images, set info, etc.)

### `resolveCard(ptcgoCode, number, setMap)`
- Looks up `setId` from the setMap
- Calls `fetchCard(setId, number)`
- If ptcgoCode not found in map, returns an error result

All fetches check sessionStorage before making network requests.

## Reactive State — `src/lib/deck.svelte.js`

Exports `createDeck()` returning a reactive object:

- **`loadDeck(text)`** — Parses text via `parseDeck()`, fetches set map (if not cached), kicks off parallel `resolveCard()` for each unique card entry. Updates each card's state individually as its fetch resolves (progressive loading).
- **`deck`** — `$state` holding the parsed structure. Each card entry gets enriched with `{ image, loading, error }` as fetches complete.
- **`loading`** — `$derived` boolean, true while any card is still fetching.
- **`exportDeck()`** — Serializes current deck back to PTCGL text format: section headers with counts, card lines as `{qty} {name} {setCode} {number}`, blank lines between sections, `Total Cards: N` at end.
- **`reset()`** — Clears deck state back to initial (no deck loaded).

## Components

### `App.svelte`
- Top-level flow control
- No deck loaded → show `DeckInput`
- Deck loaded → show `DeckView` + `ExportButton`
- Manages the `createDeck()` instance

### `DeckInput.svelte`
- Large textarea with placeholder showing example PTCGL format
- "Load Deck" button, disabled when textarea is empty
- On submit: dispatches raw text to parent

### `DeckView.svelte`
- Iterates `deck.sections`
- Each section: header (name + card count) then CSS grid of `CardTile` components
- Grid: `grid-template-columns: repeat(auto-fill, minmax(120px, 1fr))`

### `CardTile.svelte`
Three visual states:
- **Loading**: Grey rounded rectangle with subtle pulse animation (skeleton)
- **Loaded**: Card image (`images.small`), quantity badge (pill, top-left corner), card name + set/number label below
- **Error**: Warning icon + card name as text, no image

### `ExportButton.svelte`
- Button that calls `exportDeck()`
- Copies result to clipboard
- Brief "Copied!" feedback text (reverts after ~2s)

## Styling

- Minimal, clean CSS scoped to components
- Card grid with auto-fill responsive columns
- Skeleton pulse animation via CSS `@keyframes`
- Quantity badge: small pill overlay on card thumbnail
- Section headers: simple bold text dividers with bottom border
- No framework CSS — just component-scoped styles + minimal global resets in `app.css`

## Error Handling

- **Unrecognized decklist lines**: Flagged in parser output with `error: true`, rendered as text-only cards with warning icon in the grid
- **Card fetch failure**: Individual card shows error state; rest of deck loads normally
- **Set list fetch failure**: Error message shown in place of deck view, with retry option
- **Empty textarea**: Load button disabled

## Verification — Playwright Tests

Tests in `tests/`:

1. **Paste and display** — Paste a valid decklist → cards appear grouped by section with correct names and quantities
2. **Round-trip export** — Paste a decklist → click Export → exported text matches original input
3. **Error lines** — Paste a decklist with an unrecognized line → warning state shown for that line
4. **Loading skeletons** — After clicking Load, skeleton placeholders appear before card images resolve
5. **Empty state** — On load, textarea and Load button are visible, no deck grid shown

Tests will intercept API calls using Playwright route handlers to avoid hitting the real API.
