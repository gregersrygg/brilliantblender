import { test, expect } from '@playwright/test';
import { mockApi, SAMPLE_DECKLIST } from './helpers.js';

test('loads a deck from the URL hash and strips it', async ({ page }) => {
  await mockApi(page);
  const encoded = encodeURIComponent(SAMPLE_DECKLIST);
  await page.goto(`/#deck=${encoded}`);

  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');
});

test('shows empty state when the hash is malformed', async ({ page }) => {
  await mockApi(page);
  await page.goto('/#deck=%E0%A4%A');
  await expect(page.getByPlaceholder(/Pokémon: 4/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('');
});

test('shows empty state when no hash is present', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByPlaceholder(/Pokémon: 4/)).toBeVisible();
});
