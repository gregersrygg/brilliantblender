import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { fileURLToPath } from 'node:url'
import { loadChangelog } from './scripts/changelog.mjs'

// The analytics tag is an external <script>. Even with `async` it delays window.load,
// which is what page.goto() waits for — so if the CDN is slow or unreachable from a CI
// runner, every Playwright test times out in goto with no relation to what it asserts.
// Strip it when serving (dev + Playwright); the production build keeps it.
const stripAnalyticsInDev = {
  name: 'strip-analytics-in-dev',
  apply: 'serve',
  transformIndexHtml(html) {
    return html.replace(
      /\s*<script async src="https:\/\/scripts\.simpleanalyticscdn\.com[^>]*><\/script>/g,
      '',
    );
  },
};

const CHANGELOG_DIR = fileURLToPath(new URL('./changelog', import.meta.url));
const CHANGELOG_ID = '\0virtual:changelog';

// Builds CHANGELOG from changelog/*.txt + history.json, dated by git (see docs/architecture.md).
const changelog = {
  name: 'changelog',
  resolveId(id) {
    if (id === 'virtual:changelog') return CHANGELOG_ID;
  },
  load(id) {
    if (id !== CHANGELOG_ID) return;
    const { changelog, files } = loadChangelog(CHANGELOG_DIR);
    for (const file of files) this.addWatchFile(file);
    return `export const CHANGELOG = ${JSON.stringify(changelog)};`;
  },
  configureServer(server) {
    // addWatchFile only covers existing files; also rebuild when a fragment is added or removed.
    const reload = (file) => {
      if (!file.startsWith(CHANGELOG_DIR)) return;
      for (const env of Object.values(server.environments)) {
        const mod = env.moduleGraph.getModuleById(CHANGELOG_ID);
        if (mod) env.moduleGraph.invalidateModule(mod);
      }
      server.ws.send({ type: 'full-reload' });
    };
    server.watcher.add(CHANGELOG_DIR);
    server.watcher.on('add', reload);
    server.watcher.on('unlink', reload);
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), stripAnalyticsInDev, changelog],
  // Relative base so the build is agnostic to where it's hosted
  // (custom-domain root or a subpath).
  base: './',
})
