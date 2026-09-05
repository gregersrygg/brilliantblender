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

## Architecture Reference

See [`docs/architecture.md`](docs/architecture.md) for the full architecture reference: file responsibilities, data model, component prop interfaces, API functions, cache keys, and test infrastructure. Read this before starting any task — it is detailed enough to avoid reading source files for orientation.

## Keeping Docs Up to Date

**Part of every task and milestone:** after completing implementation, update `docs/architecture.md` to reflect any changes to files, components, functions, props, data shapes, or milestone status. The doc should always match the current code.

## Keeping the Changelog Up to Date

**Part of every user-facing change:** add an entry to the `CHANGELOG` array in `src/lib/changelog.js` (shown on the landing page via `Changelog.svelte`). Write a short, user-relevant summary — what a player would notice — not internal/CI/refactor churn. Newest first; group same-day items under one date.

## Code Comments

Keep comments sparse. Don't explain what the code does when that's clear from reading it — comment only what's genuinely unclear (a non-obvious *why*, a gotcha, a workaround). When you do comment, keep it to a single line; if more explanation is needed, put it in `docs/architecture.md`, not inline. This applies to new code from here on, and to any long comments in old code you touch — trim them to match.
