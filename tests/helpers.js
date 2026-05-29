export const NULL_MARK_POKEMON_DECKLIST = `Pokémon: 1
1 Psyduck BS 53

Total Cards: 1`;

export const NULL_MARK_TRAINER_DECKLIST = `Trainer: 1
1 Computer Search BS 71

Total Cards: 1`;

export const MIXED_LEGALITY_DECKLIST = `Pokémon: 2
1 Dragapult ex TWM 130
1 Psyduck BS 53

Total Cards: 2`;

export const PSYDUCK_DECKLIST = `Pokémon: 1
1 Psyduck BS 53

Total Cards: 1`;

export const DUNSPARCE_DECKLIST = `Pokémon: 1
1 Dunsparce TWM 100

Total Cards: 1`;

// Weedle is from me4 (Chaos Rising), legalFrom 2026-06-05 in set-legality.json.
// regulationMark 'J' is a legal mark, so it is NOT caught by the rotation warning —
// only the not-yet-legal notice applies (and only before its legalFrom date).
export const NOT_YET_LEGAL_DECKLIST = `Pokémon: 1
1 Weedle CRI 1

Total Cards: 1`;

// Pikachu CRI 25 is from the not-yet-legal me4 set, but is a functionally-identical
// reprint of the already-legal TWM Pikachu — so per Handbook §4.1.3 it is legal on
// me4's release date (2026-05-22) and must NOT show the not-yet-legal notice.
export const REPRINT_DECKLIST = `Pokémon: 1
1 Pikachu CRI 25

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
    { id: 'svp', name: 'Scarlet & Violet Promos', ptcgoCode: 'PR-SV' },
    { id: 'base1', name: 'Base Set', ptcgoCode: 'BS' },
    { id: 'me4', name: 'Chaos Rising', ptcgoCode: 'CRI' },
  ],
};

const MOCK_CARDS = {
  'sv6-130': {
    id: 'sv6-130',
    name: 'Dragapult ex',
    supertype: 'Pokémon',
    subtypes: ['Stage 2', 'ex'],
    images: { small: 'https://images.pokemontcg.io/sv6/130.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '130',
    regulationMark: 'J',
  },
  'sv6-128': {
    id: 'sv6-128',
    name: 'Dreepy',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    images: { small: 'https://images.pokemontcg.io/sv6/128.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '128',
    regulationMark: 'J',
  },
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
  'sv6-100': {
    id: 'sv6-100',
    name: 'Dunsparce',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    images: { small: 'https://images.pokemontcg.io/sv6/100.png' },
    set: { id: 'sv6', ptcgoCode: 'TWM' },
    number: '100',
    regulationMark: 'J',
  },
  'svp-97': {
    id: 'svp-97',
    name: 'Flutter Mane',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    images: { small: 'https://images.pokemontcg.io/svp/97.png' },
    set: { id: 'svp', ptcgoCode: 'PR-SV' },
    number: '97',
    regulationMark: 'H',
  },
  'svp-149': {
    id: 'svp-149',
    name: 'Pecharunt',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    images: { small: 'https://images.pokemontcg.io/svp/149.png' },
    set: { id: 'svp', ptcgoCode: 'PR-SV' },
    number: '149',
    regulationMark: 'I',
  },
  'me4-1': {
    id: 'me4-1',
    name: 'Weedle',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    images: { small: 'https://images.pokemontcg.io/me4/1.png' },
    set: { id: 'me4', ptcgoCode: 'CRI' },
    number: '1',
    regulationMark: 'J',
  },
  'me4-25': {
    id: 'me4-25',
    name: 'Pikachu',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    images: { small: 'https://images.pokemontcg.io/me4/25.png' },
    set: { id: 'me4', ptcgoCode: 'CRI' },
    number: '25',
    regulationMark: 'J',
    hp: '60',
    attacks: [{ name: 'Thunder Shock', cost: ['Lightning'], damage: '20', text: '' }],
    abilities: [],
  },
  'base1-53': {
    id: 'base1-53',
    name: 'Psyduck',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    images: { small: 'https://images.pokemontcg.io/base1/53.png' },
    set: { id: 'base1', ptcgoCode: 'BS' },
    number: '53',
    regulationMark: null,
  },
  'base1-71': {
    id: 'base1-71',
    name: 'Computer Search',
    supertype: 'Trainer',
    subtypes: ['Item'],
    images: { small: 'https://images.pokemontcg.io/base1/71.png' },
    set: { id: 'base1', ptcgoCode: 'BS' },
    number: '71',
    regulationMark: null,
  },
};

export async function mockApi(page) {
  await mockPrints(page);

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
  'Buddy-Buddy Poffin': [
    {
      id: 'me2pt5-184',
      name: 'Buddy-Buddy Poffin',
      number: '184',
      supertype: 'Trainer',
      subtypes: ['Item'],
      set: { id: 'me2pt5', ptcgoCode: 'ASC', name: 'Ascended Heroes', printedTotal: 217 },
      images: { small: 'https://images.scrydex.com/pokemon/me2pt5-184/small' },
      legalities: { standard: 'Legal', unlimited: 'Legal', expanded: 'Legal' },
      regulationMark: 'H',
      rarity: 'Common',
      rules: [],
    },
  ],

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

  // Reprint case: the me4 (CRI) print is not legal until 2026-06-05, but it is
  // functionally identical to the already-legal TWM print, so §4.1.3 makes it legal
  // on me4's release date. The not-yet-legal notice must be suppressed.
  'Pikachu': [
    {
      id: 'me4-25',
      name: 'Pikachu',
      number: '25',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      set: { id: 'me4', ptcgoCode: 'CRI', name: 'Chaos Rising', printedTotal: 180 },
      images: { small: 'https://images.pokemontcg.io/me4/25.png' },
      legalities: { standard: 'legal', expanded: 'legal', unlimited: 'legal' },
      regulationMark: 'J',
      hp: '60',
      attacks: [{ name: 'Thunder Shock', cost: ['Lightning'], damage: '20', text: '' }],
      abilities: [],
    },
    {
      id: 'sv6-200',
      name: 'Pikachu',
      number: '200',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      set: { id: 'sv6', ptcgoCode: 'TWM', name: 'Twilight Masquerade', printedTotal: 226 },
      images: { small: 'https://images.pokemontcg.io/sv6/200.png' },
      legalities: { standard: 'legal', expanded: 'legal', unlimited: 'legal' },
      regulationMark: 'H',
      hp: '60',
      attacks: [{ name: 'Thunder Shock', cost: ['Lightning'], damage: '20', text: '' }],
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

// Mock card search results: query string (partial) → array of cards
const MOCK_SEARCH_RESULTS = {
  'psyduck': [
    {
      id: 'me2pt5-39',
      name: 'Psyduck',
      number: '39',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      set: { id: 'me2pt5', ptcgoCode: 'ASC', name: 'Ascended Heroes' },
      images: { small: 'https://images.pokemontcg.io/me2pt5/39.png' },
      legalities: { standard: 'legal' },
      regulationMark: 'I',
    },
    {
      id: 'sv10-45',
      name: "Misty's Psyduck",
      number: '45',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      set: { id: 'sv10', ptcgoCode: 'DRI', name: 'Destined Rivals' },
      images: { small: 'https://images.pokemontcg.io/sv10/45.png' },
      legalities: { standard: 'legal' },
      regulationMark: 'I',
    },
  ],
  'poke': [
    {
      id: 'sv6-187',
      name: 'Poké Pad',
      number: '187',
      supertype: 'Trainer',
      subtypes: ['Item'],
      set: { id: 'sv6', ptcgoCode: 'TWM', name: 'Twilight Masquerade' },
      images: { small: 'https://images.pokemontcg.io/sv6/187.png' },
      legalities: { standard: 'legal' },
      regulationMark: 'H',
    },
  ],
  // me4 (CRI) Pikachu — not legal until 2026-06-05, but a functional reprint of the
  // already-legal TWM Pikachu (see MOCK_PRINTS_BY_NAME['Pikachu']). Added via search it
  // must NOT show the not-yet-legal notice (§4.1.3 — legal on release).
  'pikachu': [
    {
      id: 'me4-25',
      name: 'Pikachu',
      number: '25',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      set: { id: 'me4', ptcgoCode: 'CRI', name: 'Chaos Rising' },
      images: { small: 'https://images.pokemontcg.io/me4/25.png' },
      legalities: { standard: 'legal' },
      regulationMark: 'J',
      hp: '60',
      attacks: [{ name: 'Thunder Shock', cost: ['Lightning'], damage: '20', text: '' }],
      abilities: [],
    },
  ],
  // me4 (CRI) Weedle — genuinely new card with no already-legal twin, so it stays
  // flagged until me4's legalFrom (2026-06-05) even when added via search.
  'weedle': [
    {
      id: 'me4-1',
      name: 'Weedle',
      number: '1',
      supertype: 'Pokémon',
      subtypes: ['Basic'],
      set: { id: 'me4', ptcgoCode: 'CRI', name: 'Chaos Rising' },
      images: { small: 'https://images.pokemontcg.io/me4/1.png' },
      legalities: { standard: 'legal' },
      regulationMark: 'J',
    },
  ],
};

export async function mockPrints(page) {
  await page.route('**/v2/cards?*', (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q') ?? '';

    // Exact-name print lookup: name:"Card Name"
    const exactMatch = q.match(/name:"([^"]+)"/);
    if (exactMatch) {
      const name = exactMatch[1];
      const prints = MOCK_PRINTS_BY_NAME[name] ?? [];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: prints, totalCount: prints.length }),
      });
    }

    // Wildcard search: name:term*
    const wildcardMatch = q.match(/name:(\w+)\*/);
    if (wildcardMatch) {
      const term = wildcardMatch[1].toLowerCase();
      const results = MOCK_SEARCH_RESULTS[term] ?? [];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: results, totalCount: results.length }),
      });
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], totalCount: 0 }),
    });
  });
}
