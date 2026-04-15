# API Layer — `src/lib/api.js`

Base URL: `https://api.pokemontcg.io/v2`

All functions check sessionStorage before fetching and write results back. Caching errors are silently ignored (try/catch around all sessionStorage calls).

## Cache keys

| Key pattern | Stores |
|---|---|
| `bb:sets` | `Array<[ptcgoCode, setId]>` (serialized Map entries) |
| `bb:card:{setId}-{number}` | Single card object |
| `bb:name:{name}` | First search result for a card name (fallback) |
| `bb:prints:{name}` | All prints array for a card name |
| `bb:basic-energy:{apiName}` | SVE basic energy card (e.g. `Grass Energy`) |

## Functions

### `fetchSets() → Promise<Map<ptcgoCode, setId>>`

`GET /v2/sets?pageSize=250`. Returns a `Map` (e.g. `"TWM" → "sv6"`). Handles duplicate ptcgoCodes by preferring the shorter setId.

### `fetchCard(setId, number) → Promise<cardObject>`

`GET /v2/cards/{setId}-{number}`. Throws on non-200.

### `searchCardByName(name) → Promise<cardObject>`

`GET /v2/cards?q=name:"{name}"&pageSize=1`. Returns first result. Throws if no results.

### `resolveCard(ptcgoCode, number, setMap, name) → Promise<cardObject>`

Main entry point for loading deck cards. Tries `ptcgoCode → setId → fetchCard`, falls back to `searchCardByName(name)` if set lookup or card fetch fails. Throws original error if both fail.

### `fetchBasicEnergyFromSve(apiName) → Promise<cardObject>`

Fetches a basic energy from the SVE set by its canonical API name (e.g. `Grass Energy`). Used by `loadDeck` to resolve PTCGL `Basic {X} Energy` lines whose set code (e.g. `MEE`) and number do not correspond to a real API card.

### `fetchPrintsByName(name) → Promise<cardObject[]>`

`GET /v2/cards?q=name:"{name}"&orderBy=set.releaseDate&pageSize=250`. Returns all prints of a card sorted oldest→newest. Used by `PrintPicker` on mount.
