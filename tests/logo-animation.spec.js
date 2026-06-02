import { test, expect } from '@playwright/test';
import { mockApi, mockPrints, SAMPLE_DECKLIST } from './helpers.js';

// The logo SVG carries `class="logo-img"` and gains `blending` while the spin/pulse/
// sparkle animation runs. The animation is driven by a fixed 5s timer
// (playLogoAnimation in App.svelte) on page load, deck load, and reset.

test.describe('Logo blending animation', () => {
  test('animates on page load', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await expect(page.locator('.logo-img')).toHaveClass(/blending/);
  });

  test('animates on deck load', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    // Let the page-load animation finish so this assertion reflects the deck-load trigger.
    await expect(page.locator('.logo-img')).not.toHaveClass(/blending/, { timeout: 8000 });

    await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();
    await expect(page.locator('.logo-img')).toHaveClass(/blending/);
  });

  test('animates on start from scratch (New Deck)', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();
    // Wait out the deck-load animation so the next assertion reflects the reset trigger.
    await expect(page.locator('.logo-img')).not.toHaveClass(/blending/, { timeout: 8000 });

    await page.getByRole('button', { name: /new deck/i }).click();
    await page.getByRole('button', { name: /^confirm$/i }).click();
    await expect(page.locator('.logo-img')).toHaveClass(/blending/);
  });

  test('animation stops after the 5s window', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await expect(page.locator('.logo-img')).toHaveClass(/blending/);
    await expect(page.locator('.logo-img')).not.toHaveClass(/blending/, { timeout: 8000 });
  });
});
