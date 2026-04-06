# Brilliant Blender

Paste a Pokémon TCG decklist, see your cards, swap prints, and export a tournament-ready list.

## Local development

Requires Node 24 (see `.nvmrc`).

```bash
npm install
npm run dev        # dev server on http://localhost:5173
```

## Tests

```bash
npx playwright test                         # all tests
npx playwright test tests/filename.spec.js  # single file
```

## Production build

```bash
npm run build      # output to dist/
npm run preview    # preview the production build locally
```

## Deployment (GitHub Pages)

1. Build: `npm run build`
2. Deploy `dist/` to the `gh-pages` branch:
   ```bash
   npx gh-pages -d dist
   ```
3. In GitHub → Settings → Pages → set Source to `gh-pages` branch
4. Update `CNAME` with your domain and add a `CNAME` DNS record pointing to `<your-username>.github.io`
