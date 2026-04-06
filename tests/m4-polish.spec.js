// tests/m4-polish.spec.js
import { test, expect } from '@playwright/test';
import { mockApi, SAMPLE_DECKLIST } from './helpers.js';

test.describe('M4: Polish', () => {
  test('new deck button shows confirmation dialog and resets on confirm', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

    const newDeckBtn = page.getByRole('button', { name: /new deck/i });
    await expect(newDeckBtn).toBeVisible();

    // Cancel keeps deck intact
    await newDeckBtn.click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText('Start over?')).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

    // Confirm resets to empty state
    await newDeckBtn.click();
    await page.getByRole('button', { name: /confirm/i }).click();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
    await expect(page.getByRole('textbox')).toBeVisible();
    await expect(page.locator('[data-testid="card-tile"]')).toHaveCount(0);
  });

  test('shows parse warning banner for malformed lines and can dismiss it', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    const badDecklist = SAMPLE_DECKLIST + '\nTHIS LINE IS BAD';
    await page.getByRole('textbox', { name: /paste/i }).fill(badDecklist);
    await page.getByRole('button', { name: /load deck/i }).click();
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

    const banner = page.locator('[data-testid="parse-warning"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('1 line');

    await banner.getByRole('button', { name: /dismiss/i }).click();
    await expect(banner).not.toBeVisible();
  });

  test('page has og:title and og:description meta tags', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Brilliant Blender'
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      /swap pok/i
    );
  });
});
