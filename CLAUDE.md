# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `PRD.md` for product goals, milestones, and feature details.

## Stack

Svelte 5 + Vite. Node 24 (see `.nvmrc`). Hosted on GitHub Pages (static build).

```bash
npm run dev      # dev server on :5173
npm run build    # production build to dist/
npm run preview  # preview production build
```

## API & Data Mapping

- API base: `https://api.pokemontcg.io/v2`
- PTCGL format uses `ptcgoCode` (e.g. `SVI`); API uses `setId` (e.g. `sv1`). Fetch all sets once via `GET /v2/sets?pageSize=250` on load to build this mapping.
- All API responses cached in `sessionStorage` (set list, individual cards by ID, alternate prints by name).

## Testing

Playwright is used for all feature tests.

```bash
npx playwright test                        # run all tests
npx playwright test tests/filename.spec.js # run a single file
```
