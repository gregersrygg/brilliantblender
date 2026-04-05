export const SAMPLE_DECKLIST = `Pokémon: 2
1 Dragapult ex TWM 130
1 Dreepy TWM 128

Trainer: 1
1 Buddy-Buddy Poffin TEF 144

Energy: 1
1 Grass Energy SVE 1

Total Cards: 4`;

const MOCK_SETS = {
  data: [
    { id: 'sv6', name: 'Twilight Masquerade', ptcgoCode: 'TWM' },
    { id: 'sv5', name: 'Temporal Forces', ptcgoCode: 'TEF' },
    { id: 'sve', name: 'Scarlet & Violet Energies', ptcgoCode: 'SVE' },
  ],
};

const MOCK_CARDS = {
  'sv6-130': {
    id: 'sv6-130',
    name: 'Dragapult ex',
    images: { small: 'https://images.pokemontcg.io/sv6/130.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '130',
  },
  'sv6-128': {
    id: 'sv6-128',
    name: 'Dreepy',
    images: { small: 'https://images.pokemontcg.io/sv6/128.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '128',
  },
  'sv5-144': {
    id: 'sv5-144',
    name: 'Buddy-Buddy Poffin',
    images: { small: 'https://images.pokemontcg.io/sv5/144.png' },
    set: { id: 'sv5', ptcgoCode: 'TEF' },
    number: '144',
  },
  'sve-1': {
    id: 'sve-1',
    name: 'Grass Energy',
    images: { small: 'https://images.pokemontcg.io/sve/1.png' },
    set: { id: 'sve', ptcgoCode: 'SVE' },
    number: '1',
  },
};

export async function mockApi(page) {
  await page.route('**/v2/sets*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SETS),
    });
  });

  await page.route('**/v2/cards/*', (route) => {
    const url = new URL(route.request().url());
    const cardId = url.pathname.split('/').pop();
    const card = MOCK_CARDS[cardId];
    if (card) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: card }),
      });
    } else {
      route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
    }
  });
}
