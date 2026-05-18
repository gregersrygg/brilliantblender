import { test, expect } from '@playwright/test';
import {
  mockApi,
  mockPrints,
  NULL_MARK_POKEMON_DECKLIST,
  NULL_MARK_TRAINER_DECKLIST,
  MIXED_LEGALITY_DECKLIST,
  SAMPLE_DECKLIST,
} from './helpers.js';

test.describe('Legality warnings for cards with null regulation marks', () => {
  test('old Pokémon with null regulationMark shows Not Standard-legal warning', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(NULL_MARK_POKEMON_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
    await expect(page.getByText('Not Standard-legal')).toBeVisible();
  });

  test('old Trainer with null regulationMark and no legal reprint shows Not Standard-legal warning', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(NULL_MARK_TRAINER_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
    await expect(page.getByText('Not Standard-legal')).toBeVisible();
  });

  test('mixed deck shows warning only on the old card, not the legal one', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(MIXED_LEGALITY_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(2);
    await expect(page.locator('.warning-text')).toHaveCount(1);
    await expect(page.getByText('Not Standard-legal')).toBeVisible();
  });

  test('basic energy with null regulationMark does NOT show Not Standard-legal warning', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);
    // Grass Energy SVE has regulationMark: null but is basic energy — no warning
    await expect(page.getByText('Not Standard-legal')).not.toBeVisible();
  });
});
