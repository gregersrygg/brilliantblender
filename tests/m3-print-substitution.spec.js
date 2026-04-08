import { test, expect } from '@playwright/test';
import { SAMPLE_DECKLIST, PSYDUCK_DECKLIST, DUNSPARCE_DECKLIST, mockApi, mockPrints } from './helpers.js';

async function loadSampleDeck(page) {
  await mockApi(page);
  await mockPrints(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
  await page.getByRole('button', { name: /load deck/i }).click();
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);
}

test.describe('M3: Print Substitution', () => {

  test('clicking a Pokémon card opens the print picker', async ({ page }) => {
    await loadSampleDeck(page);
    await page.locator('[data-testid="card-tile"] img[alt="Dragapult ex"]').click();
    await expect(page.locator('[data-testid="print-picker"]')).toBeVisible();
  });

  test('print picker shows all prints with set code and number', async ({ page }) => {
    await loadSampleDeck(page);
    await page.locator('[data-testid="card-tile"] img[alt="Dragapult ex"]').click();
    const picker = page.locator('[data-testid="print-picker"]');
    await expect(picker).toBeVisible();
    const options = picker.locator('[data-testid="print-option"]');
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toContainText('TWM');
    await expect(options.nth(0)).toContainText('130');
    await expect(options.nth(1)).toContainText('TWM');
    await expect(options.nth(1)).toContainText('215');
  });

  test('clicked print is highlighted as current', async ({ page }) => {
    await loadSampleDeck(page);
    await page.locator('[data-testid="card-tile"] img[alt="Dragapult ex"]').click();
    const picker = page.locator('[data-testid="print-picker"]');
    await expect(picker).toBeVisible();
    const currentOption = picker.locator('[data-testid="print-option"].current');
    await expect(currentOption).toHaveCount(1);
    await expect(currentOption).toContainText('130');
  });

  test('incrementing an alternate print updates its qty', async ({ page }) => {
    await loadSampleDeck(page);
    await page.locator('[data-testid="card-tile"] img[alt="Dragapult ex"]').click();
    const picker = page.locator('[data-testid="print-picker"]');
    await expect(picker).toBeVisible();
    const altOption = picker.locator('[data-testid="print-option"]').nth(1);
    await altOption.locator('[data-testid="print-increment"]').click();
    await expect(altOption.locator('[data-testid="print-qty"]')).toHaveText('1');
  });

  test('cannot close the picker if total exceeds 4', async ({ page }) => {
    await loadSampleDeck(page);
    await page.locator('[data-testid="card-tile"] img[alt="Dragapult ex"]').click();
    const picker = page.locator('[data-testid="print-picker"]');
    await expect(picker).toBeVisible();
    // TWM 130 starts at qty=1; add 4 of TWM 215 → total=5
    const altOption = picker.locator('[data-testid="print-option"]').nth(1);
    const incBtn = altOption.locator('[data-testid="print-increment"]');
    await incBtn.click();
    await incBtn.click();
    await incBtn.click();
    await incBtn.click();
    await picker.getByRole('button', { name: /done/i }).click();
    await expect(picker).toBeVisible();
    await expect(picker.locator('[data-testid="picker-error"]')).toBeVisible();
  });

  test('substituting a print updates the exported decklist', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await loadSampleDeck(page);
    await page.locator('[data-testid="card-tile"] img[alt="Dragapult ex"]').click();
    const picker = page.locator('[data-testid="print-picker"]');
    await expect(picker).toBeVisible();
    // Set TWM 130 qty to 0
    const currentOption = picker.locator('[data-testid="print-option"]').nth(0);
    await currentOption.locator('[data-testid="print-decrement"]').click();
    // Set TWM 215 qty to 1
    const altOption = picker.locator('[data-testid="print-option"]').nth(1);
    await altOption.locator('[data-testid="print-increment"]').click();
    await picker.getByRole('button', { name: /done/i }).click();
    await expect(picker).not.toBeVisible();
    await page.getByRole('button', { name: /export/i }).click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('TWM 215');
    expect(clipboardText).not.toContain('TWM 130');
  });

  test('print picker excludes cards with a different name (no "Misty\'s Psyduck" when swapping Psyduck)', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(PSYDUCK_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();
    await expect(page.locator('[data-testid="card-tile"] img[alt="Psyduck"]')).toBeVisible();
    await page.locator('[data-testid="card-tile"] img[alt="Psyduck"]').click();
    const picker = page.locator('[data-testid="print-picker"]');
    await expect(picker).toBeVisible();
    const options = picker.locator('[data-testid="print-option"]');
    await expect(options).toHaveCount(1);
    await expect(options.nth(0)).not.toContainText("Misty's");
  });

  test('print picker shows group headers when prints have different card text', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(DUNSPARCE_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();
    await expect(page.locator('[data-testid="card-tile"] img[alt="Dunsparce"]')).toBeVisible();
    await page.locator('[data-testid="card-tile"] img[alt="Dunsparce"]').click();
    const picker = page.locator('[data-testid="print-picker"]');
    await expect(picker).toBeVisible();
    await expect(picker.locator('[data-testid="group-header-same"]')).toBeVisible();
    await expect(picker.locator('[data-testid="group-header-diff"]')).toBeVisible();
    // Same-text header appears before different-text header
    const headers = picker.locator('[data-testid="group-header-same"], [data-testid="group-header-diff"]');
    await expect(headers.nth(0)).toHaveAttribute('data-testid', 'group-header-same');
    await expect(headers.nth(1)).toHaveAttribute('data-testid', 'group-header-diff');
  });

  test('print picker does not show group headers when all prints have same card text', async ({ page }) => {
    await loadSampleDeck(page);
    await page.locator('[data-testid="card-tile"] img[alt="Dragapult ex"]').click();
    const picker = page.locator('[data-testid="print-picker"]');
    await expect(picker).toBeVisible();
    await expect(picker.locator('[data-testid="group-header-same"]')).not.toBeVisible();
    await expect(picker.locator('[data-testid="group-header-diff"]')).not.toBeVisible();
  });

});
