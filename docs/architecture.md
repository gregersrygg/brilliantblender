# Brilliant Blender — Architecture Index

Read only the sections relevant to your task. Each doc is self-contained.

**Keep docs up to date.** After any task, update the affected section(s) to match the code.

---

## File structure

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
    ExportButton.svelte    Copy-to-clipboard export button
    PrintPicker.svelte     Slide-in panel: alternate prints, qty per print

tests/
  helpers.js               Shared mock API setup + SAMPLE_DECKLIST
  m1-paste-preview.spec.js
  m2-quantity-editing.spec.js
  m3-print-substitution.spec.js
```

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
| `--skeleton` | Loading placeholder background |

---

## Milestone status

| Milestone | Status |
|---|---|
| M1: Paste & Preview | ✅ Complete |
| M2: Quantity Editing | ✅ Complete |
| M3: Print Substitution | ✅ Complete |
| M4: Polish & Deploy | ⬜ Not started |
