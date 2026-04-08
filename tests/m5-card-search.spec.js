import { test, expect } from '@playwright/test';
import { SAMPLE_DECKLIST, mockApi, mockPrints } from './helpers.js';

async function loadDeck(page) {
  await mockApi(page);
  await mockPrints(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
  await page.getByRole('button', { name: /load deck/i }).click();
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);
}

test.describe('M5: Card Search', () => {

  test('searching by name shows matching cards in dropdown', async ({ page }) => {
    await loadDeck(page);
    await page.getByPlaceholder(/search cards/i).fill('psyduck');
    const results = page.locator('.search-result');
    await expect(results).toHaveCount(2);
  });

  test('search returns both exact-name and containing-name cards (psyduck regression)', async ({ page }) => {
    await loadDeck(page);
    await page.getByPlaceholder(/search cards/i).fill('psyduck');
    const results = page.locator('.search-result');
    await expect(results).toHaveCount(2);
    await expect(results.nth(0).locator('.result-name')).toHaveText('Psyduck');
    await expect(results.nth(1).locator('.result-name')).toHaveText("Misty's Psyduck");
  });

});
