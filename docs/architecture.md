# Brilliant Blender — Architecture Index

Read only the sections relevant to your task. Each doc is self-contained.

**Keep docs up to date.** After any task, update the affected section(s) to match the code.

---

## File structure

```
src/
  main.js                  Entry point — hydrates prerendered #app (prod) or mounts fresh (dev)
  entry-server.js          SSR entry — render(App) for build-time prerendering
  app.css                  Global CSS variables and resets
  App.svelte               Top-level: flow control, picker state
  data/
    cards.json             Build-time snapshot: Standard-legal cards keyed by API ID
    sets.json              Build-time snapshot: [[ptcgoCode, setId], ...] entries
    snapshot-meta.json     Metadata: generatedAt, regulationMarks, cardCount
    set-legality.json      Per-set tournament legalFrom dates (maintained by an agentic workflow)
    upcoming-sets.json     Announced-but-unreleased sets: name + release/prerelease dates (agentic workflow)
  lib/
    parser.js              Pure function: PTCGL text → deck structure
    api.js                 API client: snapshot → sessionStorage → pokemontcg.io v2
    snapshot.js            In-memory access to bundled card/set snapshot data
    legality.js            Pure helpers: notLegalUntil, isSetLegalOn, todayIso, formatLegalDate
    legality.test.mjs      Node unit tests for legality.js
    reprint.js             Pure functional-reprint detection (shared: PrintPicker + deck legality)
    reprint.test.mjs       Node unit tests for reprint.js
    energy.js              Pure basic-energy helpers (name regex, letter→name map, SVE name match)
    energy.test.mjs        Node unit tests for energy.js
    sort.js                Pure function: sortDeck(deck) — deterministic per-section card ordering
    deck.svelte.js         Svelte 5 reactive state manager (createDeck)
    DeckInput.svelte       Textarea + "Load Deck" button (empty state)
    changelog.js           CHANGELOG data: user-facing release notes (landing page)
    Features.svelte        "Why Brilliant Blender?" differentiators grid (landing page)
    Changelog.svelte       "What's new" release-notes list (landing page)
    DeckView.svelte        Section headers + card grid
    CardTile.svelte        Individual card: image, qty badge, +/− controls
    ExportButton.svelte    Copy-to-clipboard export button
    ConfirmDialog.svelte   "Start over?" confirmation dialog (used by App.svelte)
    config.js              App-wide constants (LEGAL_REGULATION_MARKS — update annually)
    PrintPicker.svelte     Full-screen modal: alternate prints with regulation filtering, large image detail panel

public/                    Copied verbatim into dist/ at build time
  CNAME                    Custom domain (brilliantblender.com) for GitHub Pages
  favicon.svg              Browser tab icon
  logo.svg                 Standalone brand logo
  icons.svg                Sprite sheet of UI icons
  robots.txt               Allows all crawlers; points to the sitemap
  sitemap.xml              Single-URL sitemap (the app is one route)
  og-image.png             1200×630 social/link-preview card (referenced by index.html)

scripts/
  build-card-snapshot.mjs  Fetches Standard-legal cards from API, writes src/data/*.json
  og-image.html            Source template for og-image.png (render at 1200×630, screenshot to public/)
  prerender.mjs            Post-build: injects the SSR-rendered landing HTML into dist/index.html

tests/
  helpers.js               Shared mock API setup + SAMPLE_DECKLIST
  m1-paste-preview.spec.js
  m2-quantity-editing.spec.js
  m3-print-substitution.spec.js
  legality-warning.spec.js
  set-legality-warning.spec.js
  old-card-load.spec.js      Old Trainer prints resolve by name without exact-print fetch
```

`playwright.config.js` reads `PORT` (default `5173`) so concurrent git worktrees can
run the dev server without colliding.

---

## SEO & social metadata (`index.html`)

The app is a single-route, client-rendered SPA served as a static build, so all
crawler-facing metadata lives in `index.html`'s `<head>`:

- **Title + description** describe the tool with the searchable terms a player uses
  ("Pokémon TCG decklist builder"), not just the brand name.
- **`<link rel="canonical">`, `og:*`, and `twitter:*`** use absolute
  `https://brilliantblender.com/` URLs (Vite's `base: './'` only affects bundled asset
  paths, so these must be hardcoded absolute). `og:image`/`twitter:image` point at
  `/og-image.png` (1200×630, raster — SVG is not supported by most scrapers).

**Behavioural rule — one `<h1>` per page:** the brand wordmark in `App.svelte`'s header
is the page's single `<h1>` (`.wordmark`); all other headings are `<h2>`+. Keep it that
way — don't add a second `<h1>` or downgrade the wordmark to a `<span>`.

To regenerate `og-image.png`, edit `scripts/og-image.html`, serve `public/` + `scripts/`
over HTTP, and screenshot the page at a 1200×630 viewport into `public/og-image.png`.

### Prerendering (build-time SSR)

The landing/empty state is prerendered into `dist/index.html` at build time so crawlers
and link unfurlers that don't run JS still get real content (header `<h1>`, Features,
Changelog, deck-input CTA) instead of an empty `<div id="app">`. The `build` script runs
three steps: (1) `vite build` (client), (2) `vite build --ssr src/entry-server.js`
(server bundle → throwaway `dist-ssr/`), (3) `node scripts/prerender.mjs`, which calls
`render(App)` from `svelte/server`, injects the `body` into `#app`, and deletes `dist-ssr/`.
`prerender.mjs` asserts expected markers are present, so the build fails loudly if the
landing stops rendering.

On the client, `main.js` **hydrates** when `#app` already has children (prod) and falls
back to `mount` when it's empty (dev server / Playwright e2e).

**Behavioural rule — keep the landing SSR-safe:** `render(App)` runs in Node with no DOM,
and the initial client render must match the prerendered markup. Do not touch browser
globals (`window`, `document`, `sessionStorage`, `location`) at module load or during the
landing render — defer them to `onMount` or event handlers (as the `#deck=` hash parsing
in `App.svelte` already does). Avoid render output that differs between Node and the
browser, which would cause a hydration mismatch.

**Decorative backdrop (`.bg-fx`):** `App.svelte` renders a fixed, `aria-hidden`, behind-content
layer — a soft radial `--glow` behind the logo plus ~16 small `.bg-spark` "✦" sparkles
that are invisible most of the time and slowly blink to full opacity — fade in, hold, fade
out — once per 9–13s each (staggered, visible window ~35% of the cycle)
("blender lab" theme; replaced the flat `--bg`). Sparkle positions/timings come from a
**seeded** mulberry32 PRNG (fixed seed) in the `SPARKLES` const, *not* `Math.random()`:
because the landing is prerendered then hydrated, the server and client must emit identical
sparkles or hydration mismatches — so positions are deterministic by design (same every
render/visit). The twinkle keyframe is gated behind `@media (prefers-reduced-motion)` — under
reduced-motion the sparkles stay visible but static. `--glow`/`--spark` tokens live in
`app.css` (light + dark variants).

---

## Data pipelines (agentic workflows)

Two nightly-triggered agentic (gh-aw) workflows keep `src/data/*.json` current.
Both write a single data file each, guarded by a strict post-step validator that
fails the job on any out-of-scope change; both push with `SNAPSHOT_PUSH_TOKEN`.

- **`update-set-legality`** (`.github/workflows/update-set-legality.md`) — fills
  `set-legality.json` `legalFrom` dates for **special** sets (ETB/Booster-Bundle
  date from a press release + 14 days). Dispatched by `update-snapshot.yml` only
  when a newly-released set is special. Validator: `scripts/validate-legality.mjs`.

- **`update-upcoming-sets`** (`.github/workflows/update-upcoming-sets.md`) — keeps
  `upcoming-sets.json`, the list of **announced-but-unreleased** expansions. The
  card DB (pokemontcg.io) only surfaces a set at release, but The Pokémon Company
  announces each expansion on `press.pokemon.com` ~10–11 weeks earlier with the
  bare set name, **tabletop release date**, and (main sets) **Prerelease start
  date**. The agent scrapes those announcements, drops entries whose release date
  has passed, and rewrites the file. Validator: `scripts/validate-upcoming.mjs`.
  Dispatched by `update-snapshot.yml` whenever **any** set is newly released
  (`new_count != 0`) — by then the next set is always already announced — plus
  manual `workflow_dispatch`. A no-op run is valid (it simply doesn't commit).

`upcoming-sets.json` is a **name-keyed array** (no API `setId` exists before a set
releases): `{ name, series, releaseDate, prereleaseDate|null, isSpecialSet,
sourceUrl, fetchedAt }`. `name` is the bare expansion name (matches the API /
`set-legality.json` `name`) so released sets can be reconciled by name.
`prereleaseDate` is `null` for special sets (no Prerelease). It is *data only* — the
authoritative special/main classification still happens at release via the set-ID
`pt\d+` suffix in `scripts/detect-new-sets.mjs`, **not** from prerelease presence.
This data is not yet consumed by the app (a prerelease-notice UI is a follow-up).

---

## Sections

| Read this | When you need to… |
|---|---|
| [Data model](arch/data-model.md) | Understand the card/deck object shapes, or the API card object returned by pokemontcg.io |
| [State management](arch/state.md) | Work with `createDeck()` — reactive state, all methods, loading flow, validation rules |
| [API layer](arch/api.md) | Call or modify `src/lib/api.js` — functions, cache keys, endpoints |
| [Components](arch/components.md) | Work with any Svelte component or `parser.js` — props, render states, data-testid attributes |
| [Testing](arch/testing.md) | Write or modify Playwright tests — helpers, mock data, common patterns |

---

## CSS variables (`src/app.css`)

Used across all components. Light + dark mode via `@media (prefers-color-scheme: dark)`.

| Variable | Usage |
|---|---|
| `--bg` | Background |
| `--text` | Body text |
| `--text-h` | Headings / bold text |
| `--border` | Borders |
| `--accent` | Primary action colour (buttons, highlights) |
| `--error` | Red — errors and warnings |
| `--notice` | Amber — informational notices (e.g. "not legal yet") |
| `--skeleton` | Loading placeholder background |

### Mobile zoom behaviour

The page must **not** zoom on its own — only when the user intentionally
pinch-zooms (kept for accessibility; we never set `user-scalable=no` or
`maximum-scale`). Two unwanted auto-zoom triggers are suppressed:

- **Double-tap-to-zoom** — `body { touch-action: manipulation }` in `src/app.css`
  disables it while leaving panning and pinch-zoom intact.
- **iOS focus-zoom** — iOS Safari zooms when a focused field's font is < 16px,
  so every `<input>`/`<textarea>`/`<select>` must be ≥ 16px. Currently the only
  fields are the search input (`CardSearch.svelte`) and the decklist textarea
  (`DeckInput.svelte`), both 16px.

---

## Milestone status

| Milestone | Status |
|---|---|
| M1: Paste & Preview | ✅ Complete |
| M2: Quantity Editing | ✅ Complete |
| M3: Print Substitution | ✅ Complete |
| M4: Polish & Deploy | ✅ Complete |
