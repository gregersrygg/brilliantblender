import { test, expect } from '@playwright/test';
import { mockApi, mockPrints, NOT_YET_LEGAL_DECKLIST, REPRINT_DECKLIST, SAMPLE_DECKLIST } from './helpers.js';

// Weedle (CRI 1) is from me4 / Chaos Rising — legalFrom 2026-06-05 in set-legality.json.
// We pin the browser clock so these tests don't depend on the real date: legality
// entries are never dropped and legalFrom dates are fixed, so this is stable over time.

async function loadDeck(page, decklist) {
  await page.getByRole('textbox', { name: /paste/i }).fill(decklist);
  await page.getByRole('button', { name: /load deck/i }).click();
}

test.describe('Not-yet-legal set warning', () => {
  test('card from a set that is not legal yet shows "Legal from <date>" notice', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-06-01T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await loadDeck(page, NOT_YET_LEGAL_DECKLIST);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
    await expect(page.getByText('Legal from Jun 5, 2026')).toBeVisible();
    // Informational amber notice, NOT the red error border.
    await expect(page.locator('.card-notice')).toHaveCount(1);
    await expect(page.locator('.card-warning')).toHaveCount(0);
  });

  test('once the legal date has passed, no notice is shown', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-06-10T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await loadDeck(page, NOT_YET_LEGAL_DECKLIST);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
    await expect(page.getByText(/Legal from/)).toHaveCount(0);
    await expect(page.locator('.card-notice')).toHaveCount(0);
  });

  test('a functionally-identical reprint of a legal card shows no notice (legal on release, §4.1.3)', async ({ page }) => {
    // me4 isn't tournament-legal until 2026-06-05, but Pikachu is a reprint of the
    // already-legal TWM Pikachu, so it's legal from me4's release date (2026-05-22).
    await page.clock.setFixedTime(new Date('2026-06-01T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await loadDeck(page, REPRINT_DECKLIST);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
    await expect(page.getByText(/Legal from/)).toHaveCount(0);
    await expect(page.locator('.card-notice')).toHaveCount(0);
  });

  test('a red rule violation takes precedence over the amber not-yet-legal notice', async ({ page }) => {
    // 5 copies of a not-yet-legal card: over the 4-copy limit AND from a future set.
    // The red "Max 4 copies" error must win — no amber notice, no amber border.
    await page.clock.setFixedTime(new Date('2026-06-01T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await loadDeck(page, `Pokémon: 5\n5 Weedle CRI 1\n\nTotal Cards: 5`);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
    await expect(page.getByText(/Max 4 copies/)).toBeVisible();
    await expect(page.getByText(/Legal from/)).toHaveCount(0);
    await expect(page.locator('.card-notice')).toHaveCount(0);
    await expect(page.locator('.card-warning')).toHaveCount(1);
  });

  test('a card from an already-legal set never shows the notice', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-06-01T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await loadDeck(page, SAMPLE_DECKLIST);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);
    await expect(page.getByText(/Legal from/)).toHaveCount(0);
  });

  // ── Issue #20: the §4.1.3 reprint rule must also apply when a card is added via the
  // search box or rebuilt via the print picker, not just on paste/load. ──

  // Start from an empty deck so addCard has to CREATE the section — the path the bug
  // actually hit (a freshly-created section is a raw, non-reactive object).
  test('a reprint added via search shows no notice (§4.1.3, issue #20)', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-06-01T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await page.getByRole('button', { name: /start from scratch/i }).click();

    await page.getByPlaceholder(/search cards/i).fill('pikachu');
    await page.locator('.search-result').first().click();

    // Pikachu (me4/CRI) is a functional reprint of the already-legal TWM Pikachu,
    // so it is legal on me4's release date — no not-yet-legal notice.
    await expect(page.locator('[data-testid="card-tile"] img[alt="Pikachu"]')).toBeVisible();
    await expect(page.getByText(/Legal from/)).toHaveCount(0);
    await expect(page.locator('.card-notice')).toHaveCount(0);
  });

  test('a genuinely-new card added via search still shows the notice', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-06-01T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await page.getByRole('button', { name: /start from scratch/i }).click();

    await page.getByPlaceholder(/search cards/i).fill('weedle');
    await page.locator('.search-result').first().click();

    // Weedle (me4/CRI) has no already-legal twin, so it stays flagged until 2026-06-05.
    await expect(page.locator('[data-testid="card-tile"] img[alt="Weedle"]')).toBeVisible();
    await expect(page.getByText('Legal from Jun 5, 2026')).toBeVisible();
  });

  test('a reprint kept via the print picker shows no notice (§4.1.3, applyPrintPicker)', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-06-01T12:00:00'));
    await mockApi(page);
    await mockPrints(page);
    await page.goto('/');
    await loadDeck(page, REPRINT_DECKLIST);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
    await expect(page.getByText(/Legal from/)).toHaveCount(0);

    // Re-running the card through the picker rebuilds it via applyPrintPicker.
    await page.locator('[data-testid="card-tile"] img[alt="Pikachu"]').click();
    const picker = page.locator('[data-testid="print-picker"]');
    await expect(picker).toBeVisible();
    await picker.getByRole('button', { name: /done/i }).click();

    await expect(picker).toHaveCount(0);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
    await expect(page.getByText(/Legal from/)).toHaveCount(0);
    await expect(page.locator('.card-notice')).toHaveCount(0);
  });
});
