# Test Infrastructure

All tests use Playwright. Config: `playwright.config.js` (runs against `localhost:5173`).

## Test files

| File | Covers |
|---|---|
| `tests/m1-paste-preview.spec.js` | Paste, load, card grid, export, error lines, fallback search, skeletons |
| `tests/m2-quantity-editing.spec.js` | +/− controls, deck total, section counts, warnings, export |
| `tests/m3-print-substitution.spec.js` | Print Picker open/close, print list, current highlight, qty controls, >4 validation, export |

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

### `mockApi(page)`

Call before `page.goto('/')`. Registers:
- `**/v2/sets*` → `MOCK_SETS`
- `**/v2/cards/*` → `MOCK_CARDS[cardId]` or 404

### `mockPrints(page)`

Call in addition to `mockApi` for M3 tests. Registers:
- `**/v2/cards?*` → parses `q=name:"..."`, returns `MOCK_PRINTS_BY_NAME[name]` or `[]`

### Mock data

**`MOCK_SETS`** — three sets:

| ptcgoCode | setId | Name |
|---|---|---|
| TWM | sv6 | Twilight Masquerade |
| TEF | sv5 | Temporal Forces |
| SVE | sve | Scarlet & Violet Energies |

**`MOCK_CARDS`** — four cards (keyed by `{setId}-{number}`):

| Key | Card |
|---|---|
| sv6-130 | Dragapult ex (Pokémon) |
| sv6-128 | Dreepy (Pokémon) |
| sv5-144 | Buddy-Buddy Poffin (Trainer) |
| sve-1 | Grass Energy (Energy) |

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

// Clipboard assertions (grant permission first)
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
await page.getByRole('button', { name: /export/i }).click();
const text = await page.evaluate(() => navigator.clipboard.readText());
```

Preferred selectors: `getByRole` for buttons/inputs, `data-testid` for specific elements, `img[alt="Card Name"]` for card images.
