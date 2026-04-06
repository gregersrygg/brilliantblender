# M1 — Paste & Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User pastes a PTCGL decklist, sees card images in a grid, and exports the list back to text.

**Architecture:** Four layers — pure parser (`parser.js`), API client with caching (`api.js`), Svelte 5 reactive state (`deck.svelte.js`), and thin UI components. All API calls mocked in Playwright tests via route interception.

**Tech Stack:** Svelte 5 ($state/$derived runes), Vite 8, Playwright, pokemontcg.io v2 API, sessionStorage caching.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/parser.js` | Pure function: decklist text → structured sections/cards |
| `src/lib/api.js` | Set-list fetch, ptcgoCode→setId mapping, card fetch, sessionStorage cache |
| `src/lib/deck.svelte.js` | Reactive deck state, orchestrates parsing + fetching, export |
| `src/App.svelte` | Top-level flow: input view vs deck view |
| `src/lib/DeckInput.svelte` | Textarea + Load Deck button |
| `src/lib/DeckView.svelte` | Section headers + card grid |
| `src/lib/CardTile.svelte` | Single card: skeleton / image / error states |
| `src/lib/ExportButton.svelte` | Export to clipboard button |
| `src/app.css` | Minimal global resets (replace scaffold styles) |
| `index.html` | Update title to "Brilliant Blender" |
| `tests/m1-paste-preview.spec.js` | All M1 Playwright e2e tests |
| `tests/helpers.js` | Shared test fixtures: sample decklist text, mock API route setup |

---

### Task 1: Scaffold Cleanup

**Files:**
- Modify: `index.html`
- Modify: `src/app.css`
- Modify: `src/App.svelte`
- Modify: `src/main.js`
- Delete: `src/lib/Counter.svelte`
- Delete: `src/assets/hero.png`, `src/assets/svelte.svg`, `src/assets/vite.svg`

- [ ] **Step 1: Update index.html title**

```html
<title>Brilliant Blender</title>
```

- [ ] **Step 2: Replace app.css with minimal resets**

```css
:root {
  --text: #374151;
  --text-h: #111827;
  --bg: #f9fafb;
  --border: #e5e7eb;
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --error: #ef4444;
  --skeleton: #e5e7eb;

  --sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, Consolas, monospace;

  font: 16px/1.5 var(--sans);
  color: var(--text);
  background: var(--bg);
}

@media (prefers-color-scheme: dark) {
  :root {
    --text: #9ca3af;
    --text-h: #f3f4f6;
    --bg: #111827;
    --border: #374151;
    --accent: #818cf8;
    --accent-hover: #6366f1;
    --error: #f87171;
    --skeleton: #374151;
  }
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
}

#app {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px;
}
```

- [ ] **Step 3: Replace App.svelte with empty shell**

```svelte
<script>
</script>

<main>
  <h1>Brilliant Blender</h1>
</main>
```

- [ ] **Step 4: Keep main.js as-is** (already correct)

- [ ] **Step 5: Delete scaffold files**

```bash
rm src/lib/Counter.svelte src/assets/hero.png src/assets/svelte.svg src/assets/vite.svg
```

- [ ] **Step 6: Verify dev server runs**

```bash
npm run dev
```

Open http://localhost:5173 — should show "Brilliant Blender" heading.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: clean scaffold, set up Brilliant Blender shell"
```

---

### Task 2: Empty State Test + DeckInput Component

**Files:**
- Create: `tests/m1-paste-preview.spec.js`
- Create: `src/lib/DeckInput.svelte`
- Modify: `src/App.svelte`

- [ ] **Step 1: Write the empty state test**

```js
// tests/m1-paste-preview.spec.js
import { test, expect } from '@playwright/test';

test.describe('M1: Paste & Preview', () => {
  test('shows textarea and Load Deck button on initial load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: /paste/i })).toBeVisible();
    const loadButton = page.getByRole('button', { name: /load deck/i });
    await expect(loadButton).toBeVisible();
    await expect(loadButton).toBeDisabled();
  });

  test('enables Load Deck button when textarea has content', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill('some text');
    await expect(page.getByRole('button', { name: /load deck/i })).toBeEnabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx playwright test tests/m1-paste-preview.spec.js
```

Expected: FAIL — no textarea or button exists yet.

- [ ] **Step 3: Create DeckInput.svelte**

```svelte
<!-- src/lib/DeckInput.svelte -->
<script>
  let { onload } = $props();
  let text = $state('');
</script>

<div class="deck-input">
  <label for="deck-textarea" class="sr-only">Paste your decklist</label>
  <textarea
    id="deck-textarea"
    aria-label="Paste your decklist"
    bind:value={text}
    placeholder={"Pokémon: 4\n4 Gardevoir ex SVI 86\n\nTrainer: 4\n4 Nest Ball SVI 181\n\nEnergy: 4\n4 Psychic Energy SVE 5"}
    rows="12"
  ></textarea>
  <button disabled={text.trim() === ''} onclick={() => onload(text)}>
    Load Deck
  </button>
</div>

<style>
  .deck-input {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 600px;
    margin: 0 auto;
  }

  textarea {
    font-family: var(--mono);
    font-size: 14px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-h);
    resize: vertical;
    width: 100%;
  }

  textarea::placeholder {
    color: var(--text);
    opacity: 0.5;
  }

  button {
    align-self: flex-start;
    padding: 10px 24px;
    font-size: 16px;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
</style>
```

- [ ] **Step 4: Wire DeckInput into App.svelte**

```svelte
<script>
  import DeckInput from './lib/DeckInput.svelte';
</script>

<main>
  <h1>Brilliant Blender</h1>
  <DeckInput onload={(text) => console.log('load', text)} />
</main>
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx playwright test tests/m1-paste-preview.spec.js
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/m1-paste-preview.spec.js src/lib/DeckInput.svelte src/App.svelte
git commit -m "feat: add DeckInput component with empty state tests"
```

---

### Task 3: Parser Module

**Files:**
- Create: `src/lib/parser.js`

- [ ] **Step 1: Write a Playwright test that exercises the parser through the UI**

We'll add this test now but it won't pass until Tasks 4–6 wire everything up. For now, we implement the parser as a standalone module and verify it manually. The e2e test comes in Task 6.

Create the parser:

```js
// src/lib/parser.js

const SECTION_RE = /^(Pokémon|Pokemon|Trainer|Energy)\s*:\s*(\d+)\s*$/i;
const CARD_RE = /^(\d+)\s+(.+?)\s+([A-Za-z]{2,6})\s+(\d+)\s*$/;
const TOTAL_RE = /^Total Cards\s*:\s*\d+\s*$/i;

/**
 * Parse a PTCGL-format decklist into structured sections.
 * @param {string} text - Raw decklist text
 * @returns {{ sections: Array<{ name: string, count: number, cards: Array }>, totalCount: number }}
 */
export function parseDeck(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') continue;
    if (TOTAL_RE.test(line)) continue;

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      current = { name: normalizeSectionName(sectionMatch[1]), count: 0, cards: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      // Line before any section header — create a default section
      current = { name: 'Unknown', count: 0, cards: [] };
      sections.push(current);
    }

    const cardMatch = line.match(CARD_RE);
    if (cardMatch) {
      const qty = parseInt(cardMatch[1], 10);
      current.cards.push({
        qty,
        name: cardMatch[2],
        setCode: cardMatch[3],
        number: cardMatch[4],
      });
      current.count += qty;
    } else {
      current.cards.push({
        qty: 0,
        name: line,
        setCode: '',
        number: '',
        error: true,
      });
    }
  }

  const totalCount = sections.reduce((sum, s) => sum + s.count, 0);
  return { sections, totalCount };
}

function normalizeSectionName(name) {
  const lower = name.toLowerCase();
  if (lower === 'pokemon' || lower === 'pokémon') return 'Pokémon';
  if (lower === 'trainer') return 'Trainer';
  if (lower === 'energy') return 'Energy';
  return name;
}
```

- [ ] **Step 2: Verify the module loads without errors**

```bash
node -e "import('./src/lib/parser.js').then(m => console.log(JSON.stringify(m.parseDeck('Pokémon: 1\n1 Pikachu ex SVI 55'), null, 2)))"
```

Expected output shows 1 section with 1 card.

- [ ] **Step 3: Commit**

```bash
git add src/lib/parser.js
git commit -m "feat: add PTCGL decklist parser"
```

---

### Task 4: API Module

**Files:**
- Create: `src/lib/api.js`

- [ ] **Step 1: Implement api.js**

```js
// src/lib/api.js

const API_BASE = 'https://api.pokemontcg.io/v2';

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage full or unavailable — continue without caching
  }
}

/**
 * Fetch all sets and build a ptcgoCode → setId map.
 * @returns {Promise<Map<string, string>>}
 */
export async function fetchSets() {
  const cached = cacheGet('bb:sets');
  if (cached) {
    return new Map(cached);
  }

  const res = await fetch(`${API_BASE}/sets?pageSize=250`);
  if (!res.ok) throw new Error(`Failed to fetch sets: ${res.status}`);

  const json = await res.json();
  const entries = [];
  for (const set of json.data) {
    if (set.ptcgoCode) {
      entries.push([set.ptcgoCode, set.id]);
    }
  }

  cacheSet('bb:sets', entries);
  return new Map(entries);
}

/**
 * Fetch a single card by its API ID (e.g. "sv1-181").
 * @param {string} setId
 * @param {string} number
 * @returns {Promise<object>}
 */
export async function fetchCard(setId, number) {
  const cardId = `${setId}-${number}`;
  const cacheKey = `bb:card:${cardId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/cards/${cardId}`);
  if (!res.ok) throw new Error(`Failed to fetch card ${cardId}: ${res.status}`);

  const json = await res.json();
  cacheSet(cacheKey, json.data);
  return json.data;
}

/**
 * Resolve a card from ptcgoCode + number using the set map.
 * @param {string} ptcgoCode - e.g. "SVI"
 * @param {string} number - e.g. "86"
 * @param {Map<string, string>} setMap - ptcgoCode → setId
 * @returns {Promise<object>}
 */
export async function resolveCard(ptcgoCode, number, setMap) {
  const setId = setMap.get(ptcgoCode);
  if (!setId) {
    throw new Error(`Unknown set code: ${ptcgoCode}`);
  }
  return fetchCard(setId, number);
}
```

- [ ] **Step 2: Verify the module loads without syntax errors**

```bash
node -e "import('./src/lib/api.js').then(() => console.log('OK'))"
```

Expected: "OK" (functions reference `sessionStorage` which doesn't exist in Node, but the import itself should succeed).

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.js
git commit -m "feat: add API client with sessionStorage caching"
```

---

### Task 5: Reactive Deck State Module

**Files:**
- Create: `src/lib/deck.svelte.js`

- [ ] **Step 1: Implement deck.svelte.js**

```js
// src/lib/deck.svelte.js
import { parseDeck } from './parser.js';
import { fetchSets, resolveCard } from './api.js';

/**
 * Create a reactive deck state manager.
 * @returns {{ deck: object, loading: boolean, error: string|null, loadDeck: function, exportDeck: function, reset: function }}
 */
export function createDeck() {
  let deck = $state(null);
  let loading = $state(false);
  let error = $state(null);

  async function loadDeck(text) {
    error = null;
    loading = true;

    const parsed = parseDeck(text);
    // Initialize each card with loading state
    for (const section of parsed.sections) {
      for (const card of section.cards) {
        card.image = null;
        card.cardLoading = !card.error;
        card.cardError = card.error ? 'Unrecognized card line' : null;
      }
    }
    deck = parsed;

    let setMap;
    try {
      setMap = await fetchSets();
    } catch (e) {
      error = 'Failed to load set data. Please try again.';
      loading = false;
      return;
    }

    // Fetch all cards in parallel, updating each as it resolves
    const promises = [];
    for (const section of deck.sections) {
      for (const card of section.cards) {
        if (card.error) continue;
        promises.push(
          resolveCard(card.setCode, card.number, setMap)
            .then((data) => {
              card.image = data.images?.small || null;
              card.cardLoading = false;
            })
            .catch((e) => {
              card.cardError = e.message;
              card.cardLoading = false;
            })
        );
      }
    }

    await Promise.all(promises);
    loading = false;
  }

  function exportDeck() {
    if (!deck) return '';
    const lines = [];
    for (const section of deck.sections) {
      lines.push(`${section.name}: ${section.count}`);
      for (const card of section.cards) {
        if (card.error && !card.setCode) continue;
        lines.push(`${card.qty} ${card.name} ${card.setCode} ${card.number}`);
      }
      lines.push('');
    }
    lines.push(`Total Cards: ${deck.totalCount}`);
    return lines.join('\n');
  }

  function reset() {
    deck = null;
    loading = false;
    error = null;
  }

  return {
    get deck() { return deck; },
    get loading() { return loading; },
    get error() { return error; },
    loadDeck,
    exportDeck,
    reset,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/deck.svelte.js
git commit -m "feat: add reactive deck state module"
```

---

### Task 6: Card Grid UI + Paste & Display Test

**Files:**
- Create: `src/lib/CardTile.svelte`
- Create: `src/lib/DeckView.svelte`
- Create: `tests/helpers.js`
- Modify: `src/App.svelte`
- Modify: `tests/m1-paste-preview.spec.js`

- [ ] **Step 1: Create test helpers with sample data and mock API setup**

```js
// tests/helpers.js

export const SAMPLE_DECKLIST = `Pokémon: 2
1 Gardevoir ex SVI 86
1 Ralts SIT 67

Trainer: 1
1 Nest Ball SVI 181

Energy: 1
1 Psychic Energy SVE 5

Total Cards: 4`;

// Minimal set data: maps ptcgoCode → setId for the sets used in SAMPLE_DECKLIST
const MOCK_SETS = {
  data: [
    { id: 'sv1', name: 'Scarlet & Violet', ptcgoCode: 'SVI' },
    { id: 'sit', name: 'Silver Tempest', ptcgoCode: 'SIT' },
    { id: 'sve', name: 'Scarlet & Violet Energies', ptcgoCode: 'SVE' },
  ],
};

// Minimal card data for each card in SAMPLE_DECKLIST
const MOCK_CARDS = {
  'sv1-86': {
    id: 'sv1-86',
    name: 'Gardevoir ex',
    images: { small: 'https://images.pokemontcg.io/sv1/86.png' },
    set: { id: 'sv1', ptcgoCode: 'SVI' },
    number: '86',
  },
  'sit-67': {
    id: 'sit-67',
    name: 'Ralts',
    images: { small: 'https://images.pokemontcg.io/sit/67.png' },
    set: { id: 'sit', ptcgoCode: 'SIT' },
    number: '67',
  },
  'sv1-181': {
    id: 'sv1-181',
    name: 'Nest Ball',
    images: { small: 'https://images.pokemontcg.io/sv1/181.png' },
    set: { id: 'sv1', ptcgoCode: 'SVI' },
    number: '181',
  },
  'sve-5': {
    id: 'sve-5',
    name: 'Psychic Energy',
    images: { small: 'https://images.pokemontcg.io/sve/5.png' },
    set: { id: 'sve', ptcgoCode: 'SVE' },
    number: '5',
  },
};

/**
 * Set up Playwright route handlers to mock the pokemontcg.io API.
 * Call this before navigating to the page.
 */
export async function mockApi(page) {
  await page.route('**/v2/sets*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SETS),
    });
  });

  await page.route('**/v2/cards/*', (route) => {
    const url = new URL(route.request().url());
    const cardId = url.pathname.split('/').pop();
    const card = MOCK_CARDS[cardId];
    if (card) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: card }),
      });
    } else {
      route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
    }
  });
}
```

- [ ] **Step 2: Write the paste & display test**

Append to `tests/m1-paste-preview.spec.js`:

```js
import { SAMPLE_DECKLIST, mockApi } from './helpers.js';

// ... existing tests stay ...

test.describe('M1: Paste & Preview', () => {
  // ... keep existing empty state tests ...

  test('displays cards grouped by section after loading a decklist', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();

    // Section headers visible
    await expect(page.getByRole('heading', { name: /Pokémon/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Trainer/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Energy/i })).toBeVisible();

    // Card images loaded (4 cards in sample)
    const cardImages = page.locator('[data-testid="card-tile"] img');
    await expect(cardImages).toHaveCount(4);

    // Quantity badges visible
    const badges = page.locator('[data-testid="card-tile"] .qty-badge');
    await expect(badges.first()).toHaveText('1');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx playwright test tests/m1-paste-preview.spec.js --grep "displays cards"
```

Expected: FAIL — no deck view components exist yet.

- [ ] **Step 4: Create CardTile.svelte**

```svelte
<!-- src/lib/CardTile.svelte -->
<script>
  let { card } = $props();
</script>

<div class="card-tile" data-testid="card-tile">
  {#if card.cardLoading}
    <div class="skeleton"></div>
  {:else if card.cardError}
    <div class="error-card">
      <span class="warning-icon">&#x26A0;</span>
      <span class="card-name">{card.name}</span>
    </div>
  {:else}
    <div class="card-image-wrapper">
      <span class="qty-badge">{card.qty}</span>
      <img src={card.image} alt={card.name} loading="lazy" />
    </div>
  {/if}
  {#if !card.cardError}
    <div class="card-label">{card.name} {card.setCode} {card.number}</div>
  {/if}
</div>

<style>
  .card-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .card-image-wrapper {
    position: relative;
    width: 100%;
  }

  .card-image-wrapper img {
    width: 100%;
    border-radius: 6px;
    display: block;
  }

  .qty-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 10px;
    line-height: 1.2;
  }

  .card-label {
    font-size: 11px;
    color: var(--text);
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .skeleton {
    width: 100%;
    aspect-ratio: 245 / 342;
    background: var(--skeleton);
    border-radius: 6px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .error-card {
    width: 100%;
    aspect-ratio: 245 / 342;
    background: var(--skeleton);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px;
  }

  .warning-icon {
    font-size: 24px;
  }

  .error-card .card-name {
    font-size: 12px;
    color: var(--error);
    text-align: center;
    word-break: break-word;
  }
</style>
```

- [ ] **Step 5: Create DeckView.svelte**

```svelte
<!-- src/lib/DeckView.svelte -->
<script>
  import CardTile from './CardTile.svelte';

  let { sections } = $props();
</script>

<div class="deck-view">
  {#each sections as section}
    <section class="deck-section">
      <h2>{section.name} <span class="section-count">({section.count})</span></h2>
      <div class="card-grid">
        {#each section.cards as card}
          <CardTile {card} />
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .deck-view {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-h);
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .section-count {
    font-weight: 400;
    color: var(--text);
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
</style>
```

- [ ] **Step 6: Wire everything into App.svelte**

```svelte
<script>
  import DeckInput from './lib/DeckInput.svelte';
  import DeckView from './lib/DeckView.svelte';
  import { createDeck } from './lib/deck.svelte.js';

  const deckState = createDeck();

  function handleLoad(text) {
    deckState.loadDeck(text);
  }
</script>

<main>
  <h1>Brilliant Blender</h1>

  {#if deckState.error}
    <div class="error-banner" role="alert">
      <p>{deckState.error}</p>
      <button onclick={() => deckState.reset()}>Try Again</button>
    </div>
  {:else if deckState.deck}
    <DeckView sections={deckState.deck.sections} />
  {:else}
    <DeckInput onload={handleLoad} />
  {/if}
</main>

<style>
  h1 {
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 24px;
    color: var(--text-h);
  }

  .error-banner {
    padding: 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--error);
    border-radius: 8px;
    text-align: center;
  }

  .error-banner p {
    margin: 0 0 12px;
    color: var(--error);
  }

  .error-banner button {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    cursor: pointer;
  }
</style>
```

- [ ] **Step 7: Run the paste & display test**

```bash
npx playwright test tests/m1-paste-preview.spec.js
```

Expected: All tests PASS. The `mockApi` intercepts API calls, cards render with images.

- [ ] **Step 8: Commit**

```bash
git add src/lib/CardTile.svelte src/lib/DeckView.svelte src/App.svelte tests/helpers.js tests/m1-paste-preview.spec.js
git commit -m "feat: add card grid display with paste & preview flow"
```

---

### Task 7: Export Button + Round-Trip Test

**Files:**
- Create: `src/lib/ExportButton.svelte`
- Modify: `src/App.svelte`
- Modify: `tests/m1-paste-preview.spec.js`

- [ ] **Step 1: Write the round-trip export test**

Append to the test describe block in `tests/m1-paste-preview.spec.js`:

```js
test('exports decklist that matches the original input', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
  await page.getByRole('button', { name: /load deck/i }).click();

  // Wait for cards to load
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

  // Click export
  await page.getByRole('button', { name: /export/i }).click();

  // Read clipboard
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

  const expected = `Pokémon: 2
1 Gardevoir ex SVI 86
1 Ralts SIT 67

Trainer: 1
1 Nest Ball SVI 181

Energy: 1
1 Psychic Energy SVE 5

Total Cards: 4`;

  expect(clipboardText).toBe(expected);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx playwright test tests/m1-paste-preview.spec.js --grep "exports decklist"
```

Expected: FAIL — no export button exists.

- [ ] **Step 3: Create ExportButton.svelte**

```svelte
<!-- src/lib/ExportButton.svelte -->
<script>
  let { onexport } = $props();
  let copied = $state(false);

  async function handleClick() {
    const text = onexport();
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => { copied = false; }, 2000);
  }
</script>

<button class="export-button" onclick={handleClick}>
  {copied ? 'Copied!' : 'Export Decklist'}
</button>

<style>
  .export-button {
    padding: 10px 24px;
    font-size: 16px;
    font-weight: 500;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text-h);
    cursor: pointer;
  }

  .export-button:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
```

- [ ] **Step 4: Add ExportButton to App.svelte**

Add the import and place the button in the deck view branch:

```svelte
<script>
  import DeckInput from './lib/DeckInput.svelte';
  import DeckView from './lib/DeckView.svelte';
  import ExportButton from './lib/ExportButton.svelte';
  import { createDeck } from './lib/deck.svelte.js';

  const deckState = createDeck();

  function handleLoad(text) {
    deckState.loadDeck(text);
  }
</script>

<main>
  <h1>Brilliant Blender</h1>

  {#if deckState.error}
    <div class="error-banner" role="alert">
      <p>{deckState.error}</p>
      <button onclick={() => deckState.reset()}>Try Again</button>
    </div>
  {:else if deckState.deck}
    <div class="deck-toolbar">
      <ExportButton onexport={() => deckState.exportDeck()} />
    </div>
    <DeckView sections={deckState.deck.sections} />
  {:else}
    <DeckInput onload={handleLoad} />
  {/if}
</main>

<style>
  h1 {
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 24px;
    color: var(--text-h);
  }

  .deck-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  .error-banner {
    padding: 16px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--error);
    border-radius: 8px;
    text-align: center;
  }

  .error-banner p {
    margin: 0 0 12px;
    color: var(--error);
  }

  .error-banner button {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    cursor: pointer;
  }
</style>
```

- [ ] **Step 5: Grant clipboard permissions in playwright.config.js**

Clipboard access requires browser permission. Update the chromium project config:

```js
projects: [
  {
    name: 'chromium',
    use: {
      browserName: 'chromium',
      permissions: ['clipboard-read', 'clipboard-write'],
    },
  },
],
```

- [ ] **Step 6: Run tests**

```bash
npx playwright test tests/m1-paste-preview.spec.js
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ExportButton.svelte src/App.svelte tests/m1-paste-preview.spec.js playwright.config.js
git commit -m "feat: add export button with clipboard copy and round-trip test"
```

---

### Task 8: Error Line + Loading Skeleton Tests

**Files:**
- Modify: `tests/m1-paste-preview.spec.js`

- [ ] **Step 1: Write the error lines test**

Append to the test describe block:

```js
test('shows warning state for unrecognized card lines', async ({ page }) => {
  await mockApi(page);
  const decklistWithError = `Pokémon: 1
1 Gardevoir ex SVI 86
this is not a valid card line

Trainer: 1
1 Nest Ball SVI 181

Energy: 1
1 Psychic Energy SVE 5

Total Cards: 3`;

  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(decklistWithError);
  await page.getByRole('button', { name: /load deck/i }).click();

  // Wait for valid cards to load
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(3);

  // Error card shows warning icon
  const errorCard = page.locator('[data-testid="card-tile"] .warning-icon');
  await expect(errorCard).toHaveCount(1);
});
```

- [ ] **Step 2: Write the loading skeletons test**

```js
test('shows skeleton placeholders while cards are loading', async ({ page }) => {
  // Delay API responses to observe skeletons
  await page.route('**/v2/sets*', async (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 'sv1', name: 'Scarlet & Violet', ptcgoCode: 'SVI' },
        ],
      }),
    });
  });

  // Delay card responses by 2 seconds
  await page.route('**/v2/cards/*', async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'sv1-86',
          name: 'Gardevoir ex',
          images: { small: 'https://images.pokemontcg.io/sv1/86.png' },
          set: { id: 'sv1', ptcgoCode: 'SVI' },
          number: '86',
        },
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill('Pokémon: 1\n1 Gardevoir ex SVI 86');
  await page.getByRole('button', { name: /load deck/i }).click();

  // Skeletons should appear immediately
  const skeletons = page.locator('[data-testid="card-tile"] .skeleton');
  await expect(skeletons).toHaveCount(1);

  // After delay, skeleton replaced by image
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1, { timeout: 5000 });
  await expect(skeletons).toHaveCount(0);
});
```

- [ ] **Step 3: Run all tests**

```bash
npx playwright test tests/m1-paste-preview.spec.js
```

Expected: All tests PASS (empty state, paste & display, export round-trip, error lines, loading skeletons).

- [ ] **Step 4: Commit**

```bash
git add tests/m1-paste-preview.spec.js
git commit -m "test: add error line and loading skeleton tests"
```

---

## Verification

After all tasks are complete, run the full test suite:

```bash
npx playwright test
```

All 6 tests should pass:
1. Shows textarea and Load Deck button on initial load
2. Enables Load Deck button when textarea has content
3. Displays cards grouped by section after loading a decklist
4. Exports decklist that matches the original input
5. Shows warning state for unrecognized card lines
6. Shows skeleton placeholders while cards are loading

Manual verification: `npm run dev`, paste a real decklist from Limitless TCG, confirm card images appear within ~5 seconds, click Export and verify clipboard content.
