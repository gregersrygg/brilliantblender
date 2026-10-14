import { test, expect } from '@playwright/test';
import { mockApi } from './helpers.js';

// Decklist subset from issue #89: rotated (mark 'G') Trainers with no legal reprint.
const ROTATED_DECKLIST = `Trainer: 2
3 Iono PAL 185
1 Super Rod PAL 188

Total Cards: 4`;

const IONO = {
  id: 'sv2-185',
  name: 'Iono',
  supertype: 'Trainer',
  subtypes: ['Supporter'],
  images: { small: 'https://images.pokemontcg.io/sv2/185.png' },
  set: { id: 'sv2', ptcgoCode: 'PAL', printedTotal: 193 },
  number: '185',
  regulationMark: 'G',
  rarity: 'Uncommon',
};

const SUPER_ROD = {
  id: 'sv2-188',
  name: 'Super Rod',
  supertype: 'Trainer',
  subtypes: ['Item'],
  images: { small: 'https://images.pokemontcg.io/sv2/188.png' },
  set: { id: 'sv2', ptcgoCode: 'PAL', printedTotal: 193 },
  number: '188',
  regulationMark: 'G',
  rarity: 'Common',
};

// The API's name:"Iono" search also matches other cards whose name merely contains "Iono".
const KILOWATTREL = {
  id: 'sv9-55',
  name: "Iono's Kilowattrel",
  supertype: 'Pokémon',
  subtypes: ['Stage 1'],
  images: { small: 'https://images.pokemontcg.io/sv9/55.png' },
  set: { id: 'sv9', ptcgoCode: 'JTG', printedTotal: 159 },
  number: '55',
  regulationMark: 'I',
  rarity: 'Rare',
};

const SEARCH_RESULTS = {
  Iono: [KILOWATTREL, IONO],
  'Super Rod': [SUPER_ROD],
};

// Mimics pokemontcg.io's intermittent 5xx: each Super Rod URL fails on its first request.
async function mockRotatedCards(page, { flakySuperRod = false } = {}) {
  await mockApi(page);

  const seen = new Set();
  const failsOnce = (url) => flakySuperRod && !seen.has(url) && seen.add(url);

  await page.route('**/v2/cards?*', (route) => {
    const q = new URL(route.request().url()).searchParams.get('q') ?? '';
    const name = q.match(/name:"([^"]+)"/)?.[1];
    if (!name || !SEARCH_RESULTS[name]) return route.fallback();
    if (name === 'Super Rod' && failsOnce(route.request().url())) {
      return route.fulfill({ status: 502, body: 'error code: 502' });
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: SEARCH_RESULTS[name] }),
    });
  });

  await page.route('**/v2/cards/sv2-18[58]', (route) => {
    const isSuperRod = route.request().url().endsWith('sv2-188');
    if (isSuperRod && failsOnce(route.request().url())) {
      return route.fulfill({ status: 502, body: 'error code: 502' });
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: isSuperRod ? SUPER_ROD : IONO }),
    });
  });
}

async function loadDeck(page) {
  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(ROTATED_DECKLIST);
  await page.getByRole('button', { name: /load deck/i }).click();
}

test.describe('Importing a deck with rotated cards (#89)', () => {
  test('Iono is not replaced by a card whose name only starts with "Iono"', async ({ page }) => {
    await mockRotatedCards(page);
    await loadDeck(page);

    const iono = page.locator('[data-testid="card-tile"]', { has: page.getByAltText('Iono', { exact: true }) });
    await expect(iono.locator('img')).toHaveAttribute('src', IONO.images.small);
    await expect(iono.getByText('Not Standard-legal')).toBeVisible();
    await expect(page.locator(`img[src="${KILOWATTREL.images.small}"]`)).toHaveCount(0);
  });

  test('Super Rod loads and shows as rotated when the API fails transiently', async ({ page }) => {
    await mockRotatedCards(page, { flakySuperRod: true });
    await loadDeck(page);

    const superRod = page.locator('[data-testid="card-tile"]', { has: page.getByAltText('Super Rod') });
    await expect(superRod.locator('img')).toHaveAttribute('src', SUPER_ROD.images.small);
    await expect(superRod.getByText('Not Standard-legal')).toBeVisible();
  });
});
