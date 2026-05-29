import { test, expect } from '@playwright/test';
import { mockApi, mockPrints, OLD_TRAINER_DECKLIST } from './helpers.js';

test.describe('Loading old Trainer/Energy prints', () => {
  test('an old Trainer print resolves by name without fetching the exact print', async ({ page }) => {
    await mockApi(page);
    await mockPrints(page);

    // Spy on the slow exact-print endpoint we are eliminating (GET /v2/cards/sv2-265).
    const exactPrintRequests = [];
    page.on('request', (req) => {
      if (/\/v2\/cards\/sv2-265(?:\?|$)/.test(req.url())) {
        exactPrintRequests.push(req.url());
      }
    });

    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(OLD_TRAINER_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();

    // Card resolves (to the legal reprint) and shows no rotation warning.
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
    await expect(page.getByText('Not Standard-legal')).not.toBeVisible();

    // The exact old print must never be fetched.
    expect(exactPrintRequests).toEqual([]);
  });
});
