// tests/m1-paste-preview.spec.js
import { test, expect } from '@playwright/test';
import { SAMPLE_DECKLIST, mockApi } from './helpers.js';

test.describe('M1: Paste & Preview', () => {
  test('shows textarea and Load Deck button on initial load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: /paste/i })).toBeVisible();
    const loadButton = page.getByRole('button', { name: /load deck/i });
    await expect(loadButton).toBeVisible();
    await expect(loadButton).toBeDisabled();
  });

  test('enables Load Deck button when textarea has content', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill('some text');
    await expect(page.getByRole('button', { name: /load deck/i })).toBeEnabled();
  });

  test('displays cards grouped by section after loading a decklist', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();

    // Section headers visible
    await expect(page.getByRole('heading', { name: /Pokémon/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Trainer/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Energy/i })).toBeVisible();

    // Card images loaded (4 cards in sample)
    const cardImages = page.locator('[data-testid="card-tile"] img');
    await expect(cardImages).toHaveCount(4);

    // Quantity badges visible
    const badges = page.locator('[data-testid="card-tile"] .qty-badge');
    await expect(badges.first()).toHaveText('1');
  });
});
