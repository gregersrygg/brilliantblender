import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), stripAnalyticsInDev],
  // Relative base so the build is agnostic to where it's hosted
  // (custom-domain root or a subpath).
  base: './',
})
