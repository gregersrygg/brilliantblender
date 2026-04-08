export const PSYDUCK_DECKLIST = `Pokémon: 1
1 Psyduck BS 53

Total Cards: 1`;

export const DUNSPARCE_DECKLIST = `Pokémon: 1
1 Dunsparce TWM 100

Total Cards: 1`;

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
  'sv6-100': {
    id: 'sv6-100',
    name: 'Dunsparce',
    images: { small: 'https://images.pokemontcg.io/sv6/100.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '100',
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

// --- M3: Print mock data ---

const MOCK_PRINTS_BY_NAME = {
  'Dragapult ex': [
    {
      id: 'sv6-130',
      name: 'Dragapult ex',
      number: '130',
      supertype: 'Pokémon',
      subtypes: ['Stage 2', 'ex'],
      set: { id: 'sv6', ptcgoCode: 'TWM', name: 'Twilight Masquerade' },
      images: { small: 'https://images.pokemontcg.io/sv6/130.png' },
      legalities: { standard: 'legal', expanded: 'legal', unlimited: 'legal' },
      regulationMark: 'J',
      hp: 320,
      attacks: [{ name: 'Phantom Dive', damage: '200', cost: ['Psychic', 'Colorless'], text: '' }],
      abilities: [],
    },
    {
      id: 'sv6-215',
      name: 'Dragapult ex',
      number: '215',
      supertype: 'Pokémon',
      subtypes: ['Stage 2', 'ex'],
      set: { id: 'sv6', ptcgoCode: 'TWM', name: 'Twilight Masquerade' },
      images: { small: 'https://images.pokemontcg.io/sv6/215.png' },
      legalities: { standard: 'legal', expanded: 'legal', unlimited: 'legal' },
      regulationMark: 'J',
      hp: 320,
      attacks: [{ name: 'Phantom Dive', damage: '200', cost: ['Psychic', 'Colorless'], text: '' }],
      abilities: [],
    },
  ],

  // Simulates API returning a contaminated result (wrong name alongside correct name).
  // The client-side filter in fetchPrintsByName should strip "Misty's Psyduck".
  'Psyduck': [
    {
      id: 'base1-53',
      name: 'Psyduck',
      number: '53',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      set: { id: 'base1', ptcgoCode: 'BS', name: 'Base Set' },
      images: { small: 'https://images.pokemontcg.io/base1/53.png' },
      legalities: { unlimited: 'legal' },
      regulationMark: null,
      hp: 50,
      attacks: [{ name: 'Headache', damage: '10', cost: ['Colorless'], text: '' }],
      abilities: [],
    },
    {
      id: 'gym1-56',
      name: "Misty's Psyduck",
      number: '56',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      set: { id: 'gym1', ptcgoCode: 'GYM', name: "Gym Heroes" },
      images: { small: 'https://images.pokemontcg.io/gym1/56.png' },
      legalities: { unlimited: 'legal' },
      regulationMark: null,
      hp: 40,
      attacks: [{ name: 'Amnesia', damage: '10', cost: ['Colorless'], text: '' }],
      abilities: [],
    },
  ],

  // Simulates a Pokémon with same name but different card text across prints.
  'Dunsparce': [
    {
      id: 'sv6-100',
      name: 'Dunsparce',
      number: '100',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      set: { id: 'sv6', ptcgoCode: 'TWM', name: 'Twilight Masquerade' },
      images: { small: 'https://images.pokemontcg.io/sv6/100.png' },
      legalities: { standard: 'legal', expanded: 'legal', unlimited: 'legal' },
      regulationMark: 'J',
      hp: 60,
      attacks: [{ name: 'Parting Scratch', damage: '20', cost: ['Colorless'], text: '' }],
      abilities: [],
    },
    {
      id: 'sv6-101',
      name: 'Dunsparce',
      number: '101',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      set: { id: 'sv6', ptcgoCode: 'TWM', name: 'Twilight Masquerade' },
      images: { small: 'https://images.pokemontcg.io/sv6/101.png' },
      legalities: { standard: 'legal', expanded: 'legal', unlimited: 'legal' },
      regulationMark: 'J',
      hp: 70,
      attacks: [{ name: 'Body Slam', damage: '30', cost: ['Colorless', 'Colorless'], text: 'Flip a coin.' }],
      abilities: [],
    },
  ],
};

export { MOCK_PRINTS_BY_NAME };

export async function mockPrints(page) {
  await page.route('**/v2/cards?*', (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q') ?? '';
    const match = q.match(/name:"([^"]+)"/);
    const name = match ? match[1] : null;
    const prints = name ? (MOCK_PRINTS_BY_NAME[name] ?? []) : [];
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: prints, totalCount: prints.length }),
    });
  });
}
