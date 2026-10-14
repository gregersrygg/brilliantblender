import { test, expect } from '@playwright/test';
import { mockApi } from './helpers.js';

// #88: two prints of the same Trainer both normalise to the newest legal print.
const TWO_PRINTS_DECKLIST = `Trainer: 4
3 Boss's Orders PAL 172
1 Boss's Orders PAL 265

Total Cards: 4`;

test('two prints of the same Trainer merge into one entry with the combined count', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(TWO_PRINTS_DECKLIST);
  await page.getByRole('button', { name: /load deck/i }).click();

  const tiles = page.locator('[data-testid="card-tile"]');
  await expect(tiles.locator('img')).toHaveCount(1);
  await expect(tiles).toHaveCount(1);
  await expect(tiles.first().locator('[data-testid="qty-display"]')).toHaveText('4');
});
