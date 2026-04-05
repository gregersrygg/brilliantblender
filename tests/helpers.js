export const SAMPLE_DECKLIST = `Pokémon: 2
1 Gardevoir ex SVI 86
1 Ralts SIT 67

Trainer: 1
1 Nest Ball SVI 181

Energy: 1
1 Psychic Energy SVE 5

Total Cards: 4`;

const MOCK_SETS = {
  data: [
    { id: 'sv1', name: 'Scarlet & Violet', ptcgoCode: 'SVI' },
    { id: 'sit', name: 'Silver Tempest', ptcgoCode: 'SIT' },
    { id: 'sve', name: 'Scarlet & Violet Energies', ptcgoCode: 'SVE' },
  ],
};

const MOCK_CARDS = {
  'sv1-86': {
    id: 'sv1-86',
    name: 'Gardevoir ex',
    images: { small: 'https://images.pokemontcg.io/sv1/86.png' },
    set: { id: 'sv1', ptcgoCode: 'SVI' },
    number: '86',
  },
  'sit-67': {
    id: 'sit-67',
    name: 'Ralts',
    images: { small: 'https://images.pokemontcg.io/sit/67.png' },
    set: { id: 'sit', ptcgoCode: 'SIT' },
    number: '67',
  },
  'sv1-181': {
    id: 'sv1-181',
    name: 'Nest Ball',
    images: { small: 'https://images.pokemontcg.io/sv1/181.png' },
    set: { id: 'sv1', ptcgoCode: 'SVI' },
    number: '181',
  },
  'sve-5': {
    id: 'sve-5',
    name: 'Psychic Energy',
    images: { small: 'https://images.pokemontcg.io/sve/5.png' },
    set: { id: 'sve', ptcgoCode: 'SVE' },
    number: '5',
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
