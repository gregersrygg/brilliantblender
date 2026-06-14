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

  test('searching without accents matches accented card names (issue #6)', async ({ page }) => {
    await loadDeck(page);
    await page.getByPlaceholder(/search cards/i).fill('poke');
    const results = page.locator('.search-result');
    await expect(results).toHaveCount(1);
    await expect(results.nth(0).locator('.result-name')).toHaveText('Poké Pad');
  });

  test('blurring the input (e.g. dismissing the iOS keyboard) keeps results visible (issue #33)', async ({ page }) => {
    await loadDeck(page);
    const input = page.getByPlaceholder(/search cards/i);
    await input.fill('psyduck');
    await expect(page.locator('.search-result')).toHaveCount(2);
    // Dismissing the on-screen keyboard blurs the input without a pointer-down
    // elsewhere on the page — results must survive that.
    await input.blur();
    await expect(page.locator('.search-result')).toHaveCount(2);
  });

  test('tapping outside the search closes the results', async ({ page }) => {
    await loadDeck(page);
    await page.getByPlaceholder(/search cards/i).fill('psyduck');
    await expect(page.locator('.search-result')).toHaveCount(2);
    // Pointer-down outside the .card-search root (top-left corner) closes it.
    await page.mouse.click(2, 2);
    await expect(page.locator('.search-result')).toHaveCount(0);
  });

  test('clear (✕) button empties the query and hides results', async ({ page }) => {
    await loadDeck(page);
    const input = page.getByPlaceholder(/search cards/i);
    await input.fill('psyduck');
    await expect(page.locator('.search-result')).toHaveCount(2);
    await page.getByRole('button', { name: /clear search/i }).click();
    await expect(page.locator('.search-result')).toHaveCount(0);
    await expect(input).toHaveValue('');
  });

});
