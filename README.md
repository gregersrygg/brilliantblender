# Brilliant Blender

Paste a Pokémon TCG decklist, see your cards, swap prints, and export a tournament-ready list.

**Live app:** https://gregersrygg.github.io/brilliantblender/

## Features

- Paste a PTCGL-format decklist and instantly see card images
- Adjust card quantities with + / − controls
- Swap any Pokémon card to a different print — same-text and different-text prints are clearly grouped
- Search and add cards by name
- Export the final list in tournament-legal PTCGL format

## Local development

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev        # dev server on http://localhost:5173
```

Create a `.env` file for the pokemontcg.io API key (optional — the app works without it but is rate-limited to 1,000 req/day per IP):

```
VITE_POKEMONTCG_API_KEY=your-key-here
```

## Tests

```bash
npx playwright test                         # all tests
npx playwright test tests/filename.spec.js  # single file
```

## Build & deploy

Deployment is automated — push to `main` and GitHub Actions builds and deploys to GitHub Pages.

The build requires the `API_KEY` secret to be set in the GitHub repository settings (Settings → Secrets → Actions).

```bash
npm run build    # build locally to dist/
npm run preview  # preview the production build
```
