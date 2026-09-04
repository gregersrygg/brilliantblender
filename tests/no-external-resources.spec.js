import { test, expect } from '@playwright/test';

// Regression guard for the CI outage on 2026-09-04 (run 33839287889): index.html loads
// the analytics tag from an external CDN, and an external <script> — even `async` — delays
// window.load, which page.goto() waits for. When that host was unreachable from the runner
// every one of the 73 tests timed out in goto. vite.config.js strips the tag when serving,
// so the suite never depends on third-party network. This test fails if that stops working
// or if another external resource is added to the served page.
test('the dev-served page loads no third-party resources', async ({ page }) => {
  const external = [];
  page.on('request', (req) => {
    const host = new URL(req.url()).host;
    if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
      external.push(req.url());
    }
  });

  await page.goto('/');
  await expect(page.getByRole('textbox', { name: /paste/i })).toBeVisible();

  expect(external).toEqual([]);
});
