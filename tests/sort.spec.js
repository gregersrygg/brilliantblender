// tests/sort.spec.js
import { test, expect } from '@playwright/test';

const SETS = {
  data: [
    { id: 'sv6', name: 'Twilight Masquerade', ptcgoCode: 'TWM' },
    { id: 'sv5', name: 'Temporal Forces', ptcgoCode: 'TEF' },
    { id: 'sv3', name: 'Obsidian Flames', ptcgoCode: 'OBF' },
    { id: 'sve', name: 'Scarlet & Violet Energies', ptcgoCode: 'SVE' },
  ],
};

const CARDS = {
  // Pokémon — mixed types and sets for ordering
  'sv3-125': {
    id: 'sv3-125',
    name: 'Charizard ex',
    supertype: 'Pokémon',
    subtypes: ['Stage 2', 'ex'],
    types: ['Fire'],
    images: { small: 'https://images.pokemontcg.io/sv3/125.png' },
    set: { id: 'sv3', ptcgoCode: 'OBF' },
    number: '125',
    regulationMark: 'H',
  },
  'sv6-10': {
    id: 'sv6-10',
    name: 'Leafeon',
    supertype: 'Pokémon',
    subtypes: ['Stage 1'],
    types: ['Grass'],
    images: { small: 'https://images.pokemontcg.io/sv6/10.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '10',
    regulationMark: 'H',
  },
  'sv6-54': {
    id: 'sv6-54',
    name: 'Pikachu ex',
    supertype: 'Pokémon',
    subtypes: ['Basic', 'ex'],
    types: ['Lightning'],
    images: { small: 'https://images.pokemontcg.io/sv6/54.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '54',
    regulationMark: 'H',
  },
  'sv6-130': {
    id: 'sv6-130',
    name: 'Dragapult ex',
    supertype: 'Pokémon',
    subtypes: ['Stage 2', 'ex'],
    types: ['Dragon'],
    images: { small: 'https://images.pokemontcg.io/sv6/130.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '130',
    regulationMark: 'H',
    evolvesFrom: 'Drakloak',
  },

  // Evolution chain: Tarountula → Spidops (two reprints)
  'sv3-19': {
    id: 'sv3-19',
    name: "Team Rocket's Tarountula",
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    types: ['Grass'],
    images: { small: 'https://images.pokemontcg.io/sv3/19.png' },
    set: { id: 'sv3', ptcgoCode: 'OBF' },
    number: '19',
    regulationMark: 'H',
  },
  'sv3-20': {
    id: 'sv3-20',
    name: "Team Rocket's Spidops",
    supertype: 'Pokémon',
    subtypes: ['Stage 1'],
    types: ['Grass'],
    images: { small: 'https://images.pokemontcg.io/sv3/20.png' },
    set: { id: 'sv3', ptcgoCode: 'OBF' },
    number: '20',
    regulationMark: 'H',
    evolvesFrom: "Team Rocket's Tarountula",
  },
  'sv6-21': {
    id: 'sv6-21',
    name: "Team Rocket's Spidops",
    supertype: 'Pokémon',
    subtypes: ['Stage 1'],
    types: ['Grass'],
    images: { small: 'https://images.pokemontcg.io/sv6/21.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '21',
    regulationMark: 'H',
    evolvesFrom: "Team Rocket's Tarountula",
  },

  // Eevee branches into different types — should stay in per-type groups
  'sv6-60': {
    id: 'sv6-60',
    name: 'Eevee',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    types: ['Colorless'],
    images: { small: 'https://images.pokemontcg.io/sv6/60.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '60',
    regulationMark: 'H',
  },
  'sv6-61': {
    id: 'sv6-61',
    name: 'Vaporeon',
    supertype: 'Pokémon',
    subtypes: ['Stage 1'],
    types: ['Water'],
    images: { small: 'https://images.pokemontcg.io/sv6/61.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '61',
    regulationMark: 'H',
    evolvesFrom: 'Eevee',
  },
  'sv6-62': {
    id: 'sv6-62',
    name: 'Jolteon',
    supertype: 'Pokémon',
    subtypes: ['Stage 1'],
    types: ['Lightning'],
    images: { small: 'https://images.pokemontcg.io/sv6/62.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '62',
    regulationMark: 'H',
    evolvesFrom: 'Eevee',
  },

  // Trainers — one of each subtype
  'sv5-144': {
    id: 'sv5-144',
    name: 'Buddy-Buddy Poffin',
    supertype: 'Trainer',
    subtypes: ['Item'],
    images: { small: 'https://images.pokemontcg.io/sv5/144.png' },
    set: { id: 'sv5', ptcgoCode: 'TEF' },
    number: '144',
    regulationMark: 'H',
  },
  'sv6-170': {
    id: 'sv6-170',
    name: 'Iono',
    supertype: 'Trainer',
    subtypes: ['Supporter'],
    images: { small: 'https://images.pokemontcg.io/sv6/170.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '170',
    regulationMark: 'H',
  },
  'sv6-171': {
    id: 'sv6-171',
    name: 'Arven',
    supertype: 'Trainer',
    subtypes: ['Supporter'],
    images: { small: 'https://images.pokemontcg.io/sv6/171.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '171',
    regulationMark: 'H',
  },
  'sv6-180': {
    id: 'sv6-180',
    name: 'Rescue Board',
    supertype: 'Trainer',
    subtypes: ['Pokémon Tool'],
    images: { small: 'https://images.pokemontcg.io/sv6/180.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '180',
    regulationMark: 'H',
  },
  'sv6-190': {
    id: 'sv6-190',
    name: 'Artazon',
    supertype: 'Trainer',
    subtypes: ['Stadium'],
    images: { small: 'https://images.pokemontcg.io/sv6/190.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '190',
    regulationMark: 'H',
  },

  // Energies
  'sve-1': {
    id: 'sve-1',
    name: 'Grass Energy',
    supertype: 'Energy',
    subtypes: ['Basic'],
    images: { small: 'https://images.pokemontcg.io/sve/1.png' },
    set: { id: 'sve', ptcgoCode: 'SVE' },
    number: '1',
    regulationMark: null,
  },
  'sve-3': {
    id: 'sve-3',
    name: 'Water Energy',
    supertype: 'Energy',
    subtypes: ['Basic'],
    images: { small: 'https://images.pokemontcg.io/sve/3.png' },
    set: { id: 'sve', ptcgoCode: 'SVE' },
    number: '3',
    regulationMark: null,
  },
  'sv5-143': {
    id: 'sv5-143',
    name: 'Luminous Energy',
    supertype: 'Energy',
    subtypes: ['Special'],
    images: { small: 'https://images.pokemontcg.io/sv5/143.png' },
    set: { id: 'sv5', ptcgoCode: 'TEF' },
    number: '143',
    regulationMark: 'H',
  },
};

async function mock(page) {
  await page.route('**/v2/sets*', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SETS) });
  });
  await page.route('**/v2/cards/*', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    const card = CARDS[id];
    if (card) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: card }) });
    } else {
      route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
    }
  });
  await page.route('**/v2/cards?*', (route) => {
    const q = new URL(route.request().url()).searchParams.get('q') ?? '';
    // Exact-name lookup (fetchNewestLegalPrint / fetchPrintsByName)
    const nameMatch = q.match(/name:"([^"]+)"/);
    if (nameMatch) {
      const matches = Object.values(CARDS).filter((c) => c.name === nameMatch[1]);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: matches, totalCount: matches.length }),
      });
    }
    // Wildcard search (searchCards)
    const terms = [...q.matchAll(/name:(\w+)\*/g)].map((m) => m[1].toLowerCase());
    if (terms.length > 0) {
      const matches = Object.values(CARDS).filter((c) =>
        terms.every((t) => c.name.toLowerCase().includes(t))
      );
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: matches, totalCount: matches.length }),
      });
    }
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], totalCount: 0 }) });
  });
}

async function sectionAlts(page, sectionName) {
  const section = page.locator('section.deck-section', {
    has: page.getByRole('heading', { name: new RegExp(`^${sectionName}`, 'i') }),
  });
  const imgs = section.locator('[data-testid="card-tile"] img');
  return imgs.evaluateAll((els) => els.map((e) => e.getAttribute('alt')));
}

async function loadDeck(page, text) {
  await page.goto('/');
  await page.getByRole('textbox', { name: /paste/i }).fill(text);
  await page.getByRole('button', { name: /load deck/i }).click();
}

test.describe('Deck auto-sort', () => {
  test('sorts Pokémon by type (color-wheel), then set, then number', async ({ page }) => {
    await mock(page);
    // Intentionally scrambled: Dragapult (Dragon), Charizard (Fire), Pikachu (Lightning), Leafeon (Grass)
    const deck = `Pokémon: 4
1 Dragapult ex TWM 130
1 Charizard ex OBF 125
1 Pikachu ex TWM 54
1 Leafeon TWM 10

Total Cards: 4`;
    await loadDeck(page, deck);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);
    expect(await sectionAlts(page, 'Pokémon')).toEqual([
      'Leafeon',      // Grass
      'Charizard ex', // Fire
      'Pikachu ex',   // Lightning
      'Dragapult ex', // Dragon
    ]);
  });

  test('sorts Trainers by subtype (Item → Supporter → Tool → Stadium), then name', async ({ page }) => {
    await mock(page);
    const deck = `Trainer: 5
1 Artazon TWM 190
1 Rescue Board TWM 180
1 Iono TWM 170
1 Arven TWM 171
1 Buddy-Buddy Poffin TEF 144

Total Cards: 5`;
    await loadDeck(page, deck);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(5);
    expect(await sectionAlts(page, 'Trainer')).toEqual([
      'Buddy-Buddy Poffin', // Item
      'Arven',              // Supporter (A)
      'Iono',               // Supporter (I)
      'Rescue Board',       // Pokémon Tool
      'Artazon',            // Stadium
    ]);
  });

  test('sorts Energy with special first (A→Z), then basic (A→Z)', async ({ page }) => {
    await mock(page);
    const deck = `Energy: 3
1 Water Energy SVE 3
1 Grass Energy SVE 1
1 Luminous Energy TEF 143

Total Cards: 3`;
    await loadDeck(page, deck);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(3);
    expect(await sectionAlts(page, 'Energy')).toEqual([
      'Luminous Energy', // Special
      'Grass Energy',    // Basic G
      'Water Energy',    // Basic W
    ]);
  });

  test('re-sorts after adding a card via search', async ({ page }) => {
    await mock(page);
    const deck = `Pokémon: 2
1 Leafeon TWM 10
1 Dragapult ex TWM 130

Total Cards: 2`;
    await loadDeck(page, deck);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(2);

    await page.getByPlaceholder(/search cards/i).fill('pikachu');
    const result = page.locator('.search-result', { hasText: 'Pikachu ex' });
    await expect(result).toBeVisible();
    await result.click();

    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(3);
    // Pikachu (Lightning) sorts between Leafeon (Grass) and Dragapult (Dragon)
    expect(await sectionAlts(page, 'Pokémon')).toEqual(['Leafeon', 'Pikachu ex', 'Dragapult ex']);
  });

  test('groups Pokémon by evolution chain (Basic before evolutions, reprints adjacent)', async ({ page }) => {
    await mock(page);
    const deck = `Pokémon: 4
1 Team Rocket's Spidops TWM 21
1 Leafeon TWM 10
1 Team Rocket's Tarountula OBF 19
1 Team Rocket's Spidops OBF 20

Total Cards: 4`;
    await loadDeck(page, deck);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(4);
    // All Grass; sorted by evolution root → Leafeon (own root) vs Tarountula group.
    // "Leafeon" < "Team Rocket's Tarountula" alphabetically, so Leafeon first.
    // Tarountula (Basic) before Spidops (Stage 1); Spidops reprints adjacent, ordered by set then number.
    expect(await sectionAlts(page, 'Pokémon')).toEqual([
      'Leafeon',
      "Team Rocket's Tarountula",
      "Team Rocket's Spidops",  // OBF 20 (sv3 setId)
      "Team Rocket's Spidops",  // TWM 21 (sv6 setId)
    ]);
  });

  test('Eevee branches keep evolutions in their own type group', async ({ page }) => {
    await mock(page);
    const deck = `Pokémon: 3
1 Jolteon TWM 62
1 Eevee TWM 60
1 Vaporeon TWM 61

Total Cards: 3`;
    await loadDeck(page, deck);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(3);
    // Water(2), Lightning(3), Colorless(10). Evolutions in their own type group, Eevee (Colorless) last.
    expect(await sectionAlts(page, 'Pokémon')).toEqual([
      'Vaporeon', // Water
      'Jolteon',  // Lightning
      'Eevee',    // Colorless
    ]);
  });

  test('keeps error cards at the end of their section', async ({ page }) => {
    await mock(page);
    const deck = `Pokémon: 3
1 junk card line
1 Dragapult ex TWM 130
1 Leafeon TWM 10

Total Cards: 3`;
    await loadDeck(page, deck);
    await expect(page.locator('[data-testid="card-tile"] img')).toHaveCount(2);

    const alts = await sectionAlts(page, 'Pokémon');
    expect(alts).toEqual(['Leafeon', 'Dragapult ex']);

    // Error card still present; rendered after resolved cards
    const allTiles = page.locator('section.deck-section', {
      has: page.getByRole('heading', { name: /^Pokémon/i }),
    }).locator('[data-testid="card-tile"]');
    await expect(allTiles).toHaveCount(3);
    await expect(allTiles.nth(2).locator('.warning-icon')).toBeVisible();
  });
});
