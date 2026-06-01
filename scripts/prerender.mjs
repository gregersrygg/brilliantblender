// Post-build step: render the landing/empty state with svelte/server and inject
// it into the built dist/index.html, so crawlers and link unfurlers get real
// content instead of an empty <div id="app">. The client then hydrates it.
//
// Runs after both `vite build` (client) and `vite build --ssr` (server bundle).
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { renderApp } from '../dist-ssr/entry-server.js';

const { head, body } = renderApp();

// Guard: fail the build loudly if the landing didn't actually render.
for (const marker of ['Brilliant Blender', 'Why Brilliant Blender']) {
  if (!body.includes(marker)) {
    throw new Error(`prerender: rendered body is missing expected marker "${marker}"`);
  }
}

const indexUrl = new URL('../dist/index.html', import.meta.url);
let html = readFileSync(indexUrl, 'utf8');

const appDiv = /<div id="app">\s*<\/div>/;
if (!appDiv.test(html)) {
  throw new Error('prerender: could not find empty <div id="app"></div> in dist/index.html');
}
html = html.replace(appDiv, `<div id="app">${body}</div>`);
if (head.trim()) {
  html = html.replace('</head>', `${head}\n</head>`);
}

writeFileSync(indexUrl, html);

// The server bundle is a build artifact only — drop it so it never ships.
rmSync(new URL('../dist-ssr', import.meta.url), { recursive: true, force: true });

console.log('prerender: injected landing HTML into dist/index.html');
