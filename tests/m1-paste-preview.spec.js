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

  test('exports decklist that matches the original input', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
    await page.getByRole('button', { name: /load deck/i }).click();

    // Wait for cards to load
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

    // Click export
    await page.getByRole('button', { name: /export/i }).click();

    // Read clipboard
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

    const expected = `Pokémon: 2
1 Dragapult ex TWM 130
1 Dreepy TWM 128

Trainer: 1
1 Buddy-Buddy Poffin TEF 144

Energy: 1
1 Grass Energy SVE 1

Total Cards: 4`;

    expect(clipboardText).toBe(expected);
  });

  test('shows warning state for unrecognized card lines', async ({ page }) => {
    await mockApi(page);
    const decklistWithError = `Pokémon: 1
1 Dragapult ex TWM 130
this is not a valid card line

Trainer: 1
1 Buddy-Buddy Poffin TEF 144

Energy: 1
1 Grass Energy SVE 1

Total Cards: 3`;

    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill(decklistWithError);
    await page.getByRole('button', { name: /load deck/i }).click();

    // Wait for valid cards to load
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(3);

    // Error card shows warning icon
    const errorCard = page.locator('[data-testid="card-tile"] .warning-icon');
    await expect(errorCard).toHaveCount(1);
  });

  test('falls back to name search for unknown set codes', async ({ page }) => {
    await page.route('**/v2/sets*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ id: 'sve', name: 'SVE Energies', ptcgoCode: 'SVE' }] }),
      });
    });

    await page.route('**/v2/cards?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'sve-1',
              name: 'Grass Energy',
              images: { small: 'https://images.pokemontcg.io/sve/1.png' },
              set: { id: 'sve', ptcgoCode: 'SVE' },
              number: '1',
            },
          ],
        }),
      });
    });

    await page.route('**/v2/cards/*', (route) => {
      route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
    });

    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill('Energy: 1\n1 Grass Energy MEE 1');
    await page.getByRole('button', { name: /load deck/i }).click();

    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
  });

  test('shows skeleton placeholders while cards are loading', async ({ page }) => {
    // Delay API responses to observe skeletons
    await page.route('**/v2/sets*', async (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'sv6', name: 'Twilight Masquerade', ptcgoCode: 'TWM' },
          ],
        }),
      });
    });

    // Delay card responses by 2 seconds
    await page.route('**/v2/cards/*', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'sv6-130',
            name: 'Dragapult ex',
            images: { small: 'https://images.pokemontcg.io/sv6/130.png' },
            set: { id: 'sv6', ptcgoCode: 'TWM' },
            number: '130',
          },
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('textbox', { name: /paste/i }).fill('Pokémon: 1\n1 Dragapult ex TWM 130');
    await page.getByRole('button', { name: /load deck/i }).click();

    // Skeletons should appear immediately
    const skeletons = page.locator('[data-testid="card-tile"] .skeleton');
    await expect(skeletons).toHaveCount(1);

    // After delay, skeleton replaced by image
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1, { timeout: 5000 });
    await expect(skeletons).toHaveCount(0);
  });
});
