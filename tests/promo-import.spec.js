import { test, expect } from '@playwright/test';
import { SNAPSHOT_PORT } from '../playwright.config.js';

// Promos pokemon-tcg-data lacks (MEP) or lags on (SVP 166+) come from the TCGdex supplement
// in the bundled snapshot, so this targets the snapshot-enabled dev server.
const SNAPSHOT_BASE_URL = `http://localhost:${SNAPSHOT_PORT}/`;

test('resolves MEP and recent SVP promos from the snapshot', async ({ page }) => {
  await page.goto(SNAPSHOT_BASE_URL);
  await page.getByRole('textbox', { name: /paste/i }).fill(
    'Pokémon: 3\n1 Alakazam MEP 9\n1 Teal Mask Ogerpon ex SVP 166\n1 Mega Latias ex MEP 11'
  );
  await page.getByRole('button', { name: /load deck/i }).click();

  const imgs = page.locator('[data-testid="card-tile"] img');
  await expect(imgs).toHaveCount(3);
  await expect(page.locator('[data-testid="card-tile"] .warning-icon')).toHaveCount(0);
  await expect(page.locator('[data-testid="coming-soon"]')).toHaveCount(0);
  await expect(page.locator('img[src*="pokemon/mep-9/"]')).toHaveCount(1);
});
