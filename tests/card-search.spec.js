import { test, expect } from '@playwright/test';
import { SAMPLE_DECKLIST, mockApi, mockPrints } from './helpers.js';
import { SNAPSHOT_PORT } from '../playwright.config.js';

// The search filters the bundled snapshot (real Standard cards), so this spec targets the
// snapshot-enabled dev server (the default one runs with VITE_DISABLE_SNAPSHOT=true for the
// API-path tests). Assertions are structural, not tied to specific card names.
const SNAPSHOT_BASE_URL = `http://localhost:${SNAPSHOT_PORT}/`;

async function loadDeck(page) {
  await mockApi(page);
  await mockPrints(page);
  await page.goto(SNAPSHOT_BASE_URL);
  await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
  await page.getByRole('button', { name: /load deck/i }).click();
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);
}

const input = page => page.locator('[data-testid="card-search-input"]');
const results = page => page.locator('[data-testid="search-result"]');
const chips = page => page.locator('[data-testid="search-chip"]');

test.describe('Card search', () => {
  test('bare name search lists matching cards', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('pikachu');
    await expect(results(page).first()).toContainText(/pikachu/i);
  });

  test('name search ignores accents (e.g. "poke" matches "Poké")', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('poke');
    await expect(results(page).filter({ hasText: /poké/i }).first()).toBeVisible();
  });

  test('a completed operator promotes to a plain-language chip and clears the input', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('type:fire ');
    await expect(chips(page)).toHaveCount(1);
    await expect(chips(page).first()).toContainText('Fire');
    await expect(input(page)).toHaveValue('');
    await expect(results(page).first()).toBeVisible();
  });

  test('the </> mirror reflects chips plus draft text', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('type:fire hp:200+ char');
    await expect(page.locator('.mirror-code')).toHaveText('type:fire hp:200+ char');
    await expect(chips(page)).toHaveCount(2);
  });

  test('removing a chip updates the query', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('type:fire hp:200+ ');
    await expect(chips(page)).toHaveCount(2);
    await chips(page).first().getByRole('button', { name: /remove/i }).click();
    await expect(chips(page)).toHaveCount(1);
    await expect(page.locator('.mirror-code')).toHaveText('hp:200+');
  });

  test('clicking a result adds it to the deck', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('pikachu');
    await expect(results(page).first()).toBeVisible();
    await results(page).first().click();
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(5);
  });

  test('clear button empties the search', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('type:fire ');
    await page.locator('.card-search .clear').click();
    await expect(chips(page)).toHaveCount(0);
    await expect(results(page)).toHaveCount(0);
  });

  test('clicking a chip reopens it for editing', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('type:fire ');
    await expect(chips(page)).toHaveCount(1);
    await chips(page).first().locator('.chip-body').click();
    // Chip goes back into the input as editable text, and its picker re-opens.
    await expect(chips(page)).toHaveCount(0);
    await expect(input(page)).toHaveValue('type:fire');
    await expect(page.locator('.card-search .picker')).toBeVisible();
  });

  test('backspace at the start of the input edits the last chip', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('hp:200+ ');
    await expect(chips(page)).toHaveCount(1);
    await input(page).focus();
    await page.keyboard.press('Backspace');
    await expect(chips(page)).toHaveCount(0);
    await expect(input(page)).toHaveValue('hp:200+');
  });

  test('alt-art rarities are hidden by default and rarity:all brings them back', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('charizard');
    await expect(results(page).first()).toBeVisible();
    const baseline = await results(page).count();
    await input(page).fill('charizard rarity:all ');
    // Opting in shows strictly more printings (the alt-art / full-art versions).
    await expect(async () => {
      expect(await results(page).count()).toBeGreaterThan(baseline);
    }).toPass();
  });

  test('set: offers autocomplete suggestions that commit to a chip', async ({ page }) => {
    await loadDeck(page);
    await input(page).fill('set:');
    const suggests = page.locator('.card-search .suggest');
    await expect(suggests.first()).toBeVisible();
    await suggests.first().click();
    await expect(chips(page)).toHaveCount(1);
    await expect(page.locator('.mirror-code')).toHaveText(/^set:/);
  });
});
