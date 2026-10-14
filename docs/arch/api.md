# API Layer — `src/lib/api.js`

Base URL: `https://api.pokemontcg.io/v2`

## Data resolution order

All lookup functions follow: **snapshot → sessionStorage → API**

The bundled snapshot (`src/data/cards.json`, `src/data/sets.json`) provides instant, offline results for all Standard-legal cards. sessionStorage caches API responses within a tab session. The live API is the fallback for cards not in the snapshot (older sets, newly released cards before a snapshot refresh).

Snapshot access is via `src/lib/snapshot.js`. Set `VITE_DISABLE_SNAPSHOT=true` to bypass (used in Playwright tests so mocked API routes take effect).

## Snapshot refresh

Run `npm run snapshot` to regenerate `src/data/*.json` (pokemon-tcg-data plus the TCGdex promo supplement — see "Promo supplement (TCGdex)" in `docs/architecture.md`). Do this when new sets release or when `LEGAL_REGULATION_MARKS` changes. The snapshot files are checked into git so deploys include them.

## Transient API errors

Every live request goes through `apiFetch`, which retries 5xx/429 responses and network errors twice (300 ms, then 1 s) before giving up. pokemontcg.io fails intermittently (a large share of requests answer 500/502), and without retries an old card with no snapshot entry, such as `Super Rod PAL 188`, showed the red error tile instead of loading as rotated (#89). 404 is not retried.

## Exact name matching

The API's `name:"X"` query matches any card whose name *contains* X (`name:"Iono"` also returns `Iono's Kilowattrel`). Every name-based lookup (`searchCardByName`, `fetchNewestLegalPrint`, `fetchPrintsByName`, and the snapshot's `findSnapshotPrint` / `getSnapshotPrintsByName`) therefore keeps only results for which `sameCardName` from `src/lib/card-name.js` is true. It ignores case, accents, apostrophe and dash variants, and extra whitespace, and it never accepts a prefix or substring match (#89).

## Cache keys (sessionStorage)

| Key pattern | Stores |
|---|---|
| `bb:sets` | `Array<[ptcgoCode, setId]>` (serialized Map entries) |
| `bb:card:{setId}-{number}` | Single card object |
| `bb:name:{name}` | First search result for a card name (fallback) |
| `bb:prints:{name}` | All prints array for a card name |
| `bb:basic-energy:{apiName}` | SVE basic energy card (e.g. `Grass Energy`) |

## Functions

### `fetchSets() → Promise<Map<ptcgoCode, setId>>`

Returns snapshot set map if available, otherwise `GET /v2/sets?pageSize=250`. Returns a `Map` (e.g. `"TWM" → "sv6"`). Handles duplicate ptcgoCodes by preferring the shorter setId.

### `fetchCard(setId, number) → Promise<cardObject>`

Checks snapshot, then sessionStorage, then `GET /v2/cards/{setId}-{number}`. Throws on miss.

### `searchCardByName(name) → Promise<cardObject>`

`GET /v2/cards?q=name:"{name}"&pageSize=30`. Returns the newest result with an exact name match (`sameCardName`). Throws if no results. (No snapshot lookup — used as a last-resort fallback.)

### `resolveCard(ptcgoCode, number, setMap, name) → Promise<cardObject>`

Main entry point for loading deck cards. Tries `ptcgoCode → setId → fetchCard` (which checks snapshot first), falls back to `searchCardByName(name)` if set lookup or card fetch fails. Throws original error if both fail.

### `fetchBasicEnergyFromSve(apiName) → Promise<cardObject>`

Checks snapshot for SVE energy by name, then fetches from API. Used by `loadDeck` to resolve PTCGL `Basic {X} Energy` lines.

### `fetchNewestLegalPrint(name, legalMarks) → Promise<cardObject>`

Checks snapshot for newest non-alt-art legal print, then falls back to API search. Used to normalize trainers/energies to current Standard printings.

### `fetchPrintsByName(name) → Promise<cardObject[]>`

Tries API first (for completeness — includes older non-Standard prints), falls back to snapshot prints on network failure. Returns all prints sorted oldest→newest.

### `searchCards(query) → Promise<cardObject[]>`

Searches snapshot first for instant results. Falls back to API wildcard search if no snapshot matches. Returns up to 20 cards sorted newest-first. Snapshot matching is diacritic-insensitive: the query and each card name are NFD-normalized and combining marks stripped, so `poke` matches `Poké Pad`.

## Snapshot module — `src/lib/snapshot.js`

Imports `src/data/cards.json` and `src/data/sets.json` at bundle time. Exports:

| Function | Returns |
|---|---|
| `getSnapshotSetMap()` | `Map<ptcgoCode, setId>` |
| `getSnapshotCard(setId, number)` | card object or `null` |
| `getSnapshotBasicEnergy(apiName)` | SVE energy card or `null` (matches via `matchesBasicEnergyName` from `energy.js`, tolerating the `"Basic "` name prefix) |
| `findSnapshotPrint(name, legalMarks)` | newest legal non-alt-art print or `null` |
| `getSnapshotPrintsByName(name)` | array of prints (oldest→newest) |
| `searchSnapshot(query)` | up to 20 matching cards (newest-first) |

All functions return empty/null when `VITE_DISABLE_SNAPSHOT=true`.
