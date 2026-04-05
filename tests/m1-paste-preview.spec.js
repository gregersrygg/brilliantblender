// tests/m1-paste-preview.spec.js
import { test, expect } from '@playwright/test';

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
});
