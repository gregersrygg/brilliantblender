# Test Infrastructure

Playwright covers all feature tests (`playwright.config.js`, runs against `localhost:5173`).
Pure-logic units use Node's built-in runner: `npm test` → `node --test scripts/*.test.mjs src/lib/*.test.mjs`.

## Test files

| File | Covers |
|---|---|
| `tests/m1-paste-preview.spec.js` | Paste, load, card grid, export, error lines, fallback search, skeletons |
| `tests/m2-quantity-editing.spec.js` | +/− controls, deck total, section counts, warnings, export |
| `tests/m3-print-substitution.spec.js` | Print Picker open/close, print list, current highlight, qty controls, >4 validation, export |
| `tests/legality-warning.spec.js` | Cards with null regulation marks show "Not Standard-legal" warning; basic energy exempt |
| `tests/set-legality-warning.spec.js` | Cards from a not-yet-legal set show amber "Legal from {date}" notice; uses `page.clock` to pin the date |
| `src/lib/legality.test.mjs` | Unit tests (`node --test`) for `notLegalUntil`, `todayIso`, `formatLegalDate` |

## `tests/helpers.js`

### `SAMPLE_DECKLIST`

4-card deck used across all test suites:
```
1 Dragapult ex TWM 130    (Pokémon)
1 Dreepy TWM 128           (Pokémon)
1 Buddy-Buddy Poffin TEF 144  (Trainer)
1 Grass Energy SVE 1      (Energy)
Total Cards: 4
```

### Legality test decklists

| Constant | Contents |
|---|---|
| `NULL_MARK_POKEMON_DECKLIST` | 1 Psyduck BS 53 (regulationMark: null) |
| `NULL_MARK_TRAINER_DECKLIST` | 1 Computer Search BS 71 (regulationMark: null) |
| `MIXED_LEGALITY_DECKLIST` | 1 Dragapult ex TWM 130 (legal) + 1 Psyduck BS 53 (null mark) |
| `NOT_YET_LEGAL_DECKLIST` | 1 Weedle CRI 1 (me4 / Chaos Rising, legalFrom 2026-06-05, reg mark J) |

### `mockApi(page)`

Call before `page.goto('/')`. Registers:
- `**/v2/sets*` → `MOCK_SETS`
- `**/v2/cards/*` → `MOCK_CARDS[cardId]` or 404

### `mockPrints(page)`

Call in addition to `mockApi` for M3 and legality tests. Registers:
- `**/v2/cards?*` → parses `q=name:"..."`, returns `MOCK_PRINTS_BY_NAME[name]` or `[]`

### Mock data

**`MOCK_SETS`** — five sets:

| ptcgoCode | setId | Name |
|---|---|---|
| TWM | sv6 | Twilight Masquerade |
| TEF | sv5 | Temporal Forces |
| SVE | sve | Scarlet & Violet Energies |
| PR-SV | svp | Scarlet & Violet Promos |
| BS | base1 | Base Set |
| CRI | me4 | Chaos Rising (not legal until 2026-06-05) |

**`MOCK_CARDS`** — keyed by `{setId}-{number}`, each with `supertype`, `subtypes`, `regulationMark`:

| Key | Card | regulationMark |
|---|---|---|
| sv6-130 | Dragapult ex (Pokémon) | J |
| sv6-128 | Dreepy (Pokémon) | J |
| sv5-144 | Buddy-Buddy Poffin (Trainer) | H |
| sve-1 | Grass Energy (Energy, Basic) | null |
| sv6-100 | Dunsparce (Pokémon) | J |
| svp-97 | Flutter Mane (Pokémon) | H |
| svp-149 | Pecharunt (Pokémon) | I |
| base1-53 | Psyduck (Pokémon) | null |
| base1-71 | Computer Search (Trainer) | null |
| me4-1 | Weedle (Pokémon, Basic) | J |

**`MOCK_PRINTS_BY_NAME`** — alternate prints for M3:

| Name | Prints |
|---|---|
| Dragapult ex | sv6-130 (TWM 130) and sv6-215 (TWM 215) |

Both prints: standard-legal, supertype Pokémon, subtypes [Stage 2, ex].

## Common test patterns

```javascript
// Load deck
await mockApi(page);
await page.goto('/');
await page.getByRole('textbox').fill(SAMPLE_DECKLIST);
await page.getByRole('button', { name: /load deck/i }).click();
await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

// M3: also mock prints
await mockPrints(page);  // call before goto

// Set-legality: pin the date so the not-yet-legal comparison is deterministic
await page.clock.setFixedTime(new Date('2026-06-01T12:00:00'));  // call before goto

// Clipboard assertions (grant permission first)
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
await page.getByRole('button', { name: /export/i }).click();
const text = await page.evaluate(() => navigator.clipboard.readText());
```

Preferred selectors: `getByRole` for buttons/inputs, `data-testid` for specific elements, `img[alt="Card Name"]` for card images.
