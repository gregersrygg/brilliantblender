import { test, expect } from '@playwright/test';
import { SAMPLE_DECKLIST, mockApi } from './helpers.js';

test('Test 1: increment updates qty badge and deck total', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
  await page.getByRole('button', { name: /load deck/i }).click();
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

  const firstTile = page.locator('[data-testid="card-tile"]').first();
  await firstTile.locator('[data-testid="increment"]').click();

  await expect(firstTile.locator('[data-testid="qty-display"]')).toHaveText('2');
  await expect(page.locator('.deck-total')).toHaveText('5 / 60');
});

test('Test 2: decrement to zero removes card from grid', async ({ page }) => {
  await page.route('**/v2/sets*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'sv6', name: 'Twilight Masquerade', ptcgoCode: 'TWM' }],
      }),
    });
  });
  await page.route('**/v2/cards/sv6-130', (route) => {
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
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);

  await page.locator('[data-testid="card-tile"]').first().locator('[data-testid="decrement"]').click();

  await expect(page.locator('[data-testid="card-tile"]')).toHaveCount(0);
});

test('Test 3: section count updates live', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
  await page.getByRole('button', { name: /load deck/i }).click();
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

  await expect(page.locator('h2').filter({ hasText: /Pokémon/i })).toContainText('(2)');

  const firstTile = page.locator('[data-testid="card-tile"]').first();
  await firstTile.locator('[data-testid="increment"]').click();

  await expect(page.locator('h2').filter({ hasText: /Pokémon/i })).toContainText('(3)');
});

test('Test 4: deck total shows and has invalid styling when not 60', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
  await page.getByRole('button', { name: /load deck/i }).click();
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

  await expect(page.locator('.deck-total')).toHaveText('4 / 60');
  await expect(page.locator('.deck-total')).toHaveClass(/invalid/);
});

test('Test 5: over-4 warning shown after incrementing beyond limit', async ({ page }) => {
  await page.route('**/v2/sets*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'sv6', name: 'Twilight Masquerade', ptcgoCode: 'TWM' }],
      }),
    });
  });
  await page.route('**/v2/cards/sv6-130', (route) => {
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
  await page.getByRole('textbox', { name: /paste/i }).fill('Pokémon: 4\n4 Dragapult ex TWM 130');
  await page.getByRole('button', { name: /load deck/i }).click();
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);

  await page.locator('[data-testid="card-tile"]').first().locator('[data-testid="increment"]').click();

  await expect(page.locator('[data-testid="card-tile"]').first()).toHaveClass(/card-warning/);
  await expect(page.locator('.warning-text')).toBeVisible();
});

test('Test 6: export reflects adjusted quantities', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(SAMPLE_DECKLIST);
  await page.getByRole('button', { name: /load deck/i }).click();
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);

  const firstTile = page.locator('[data-testid="card-tile"]').first();
  await firstTile.locator('[data-testid="increment"]').click();

  await page.getByRole('button', { name: /export/i }).click();

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain('2 Dragapult ex TWM 130');
});

test('Test 7: basic energy has no qty warning even when exceeding 4', async ({ page }) => {
  await page.route('**/v2/sets*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'sve', name: 'Scarlet & Violet Energies', ptcgoCode: 'SVE' }],
      }),
    });
  });
  await page.route('**/v2/cards/sve-1', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'sve-1',
          name: 'Grass Energy',
          supertype: 'Energy',
          subtypes: ['Basic'],
          images: { small: 'https://images.pokemontcg.io/sve/1.png' },
          set: { id: 'sve', ptcgoCode: 'SVE' },
          number: '1',
        },
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill('Energy: 5\n5 Grass Energy SVE 1');
  await page.getByRole('button', { name: /load deck/i }).click();
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);

  await expect(page.locator('.card-warning')).toHaveCount(0);
});

test('Test 8: PTCGL "Basic {X} Energy" line resolves to SVE and has no qty warning', async ({ page }) => {
  // No MEE in the set list — resolution must go through the SVE basic-energy path.
  await page.route('**/v2/sets*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{ id: 'sve', name: 'Scarlet & Violet Energies', ptcgoCode: 'SVE' }],
      }),
    });
  });
  // SVE basic-energy lookup keyed by translated name "Grass Energy".
  await page.route('**/v2/cards*', (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q') ?? '';
    if (q.includes('name:"Grass Energy"') && q.includes('set.id:sve')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 'sve-1',
            name: 'Grass Energy',
            supertype: 'Energy',
            subtypes: ['Basic'],
            images: { small: 'https://images.pokemontcg.io/sve/1.png' },
            set: { id: 'sve', ptcgoCode: 'SVE' },
            number: '1',
          }],
          totalCount: 1,
        }),
      });
    }
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill('Energy: 7\n7 Basic {G} Energy MEE 1');
  await page.getByRole('button', { name: /load deck/i }).click();

  // Card resolves to a real image (no error icon).
  await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(1);
  await expect(page.locator('[data-testid="card-tile"] .error-card')).toHaveCount(0);
  // Basic energy is exempt from the 4-copy rule.
  await expect(page.locator('.card-warning')).toHaveCount(0);
});
