const API_BASE = 'https://api.pokemontcg.io/v2';

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage full or unavailable — continue without caching
  }
}

/**
 * Fetch all sets and build a ptcgoCode → setId map.
 * @returns {Promise<Map<string, string>>}
 */
export async function fetchSets() {
  const cached = cacheGet('bb:sets');
  if (cached) {
    return new Map(cached);
  }

  const res = await fetch(`${API_BASE}/sets?pageSize=250`);
  if (!res.ok) throw new Error(`Failed to fetch sets: ${res.status}`);

  const json = await res.json();
  const seen = {};
  for (const set of json.data) {
    if (set.ptcgoCode) {
      const existing = seen[set.ptcgoCode];
      if (!existing || set.id.length < existing.length) {
        seen[set.ptcgoCode] = set.id;
      }
    }
  }
  const entries = Object.entries(seen);

  cacheSet('bb:sets', entries);
  return new Map(entries);
}

/**
 * Fetch a single card by its API ID (e.g. "sv1-181").
 * @param {string} setId
 * @param {string} number
 * @returns {Promise<object>}
 */
export async function fetchCard(setId, number) {
  const cardId = `${setId}-${number}`;
  const cacheKey = `bb:card:${cardId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/cards/${cardId}`);
  if (!res.ok) throw new Error(`Failed to fetch card ${cardId}: ${res.status}`);

  const json = await res.json();
  cacheSet(cacheKey, json.data);
  return json.data;
}

/**
 * Search for a card by name, returning the first result.
 * @param {string} name - e.g. "Charizard"
 * @returns {Promise<object>}
 */
export async function searchCardByName(name) {
  const cacheKey = `bb:name:${name}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${API_BASE}/cards?q=name:"${encodeURIComponent(name)}"&orderBy=-set.releaseDate&pageSize=1`);
  if (!res.ok) throw new Error(`Failed to search for card "${name}": ${res.status}`);

  const json = await res.json();
  if (!json.data || json.data.length === 0) {
    throw new Error(`No results found for card name: "${name}"`);
  }

  cacheSet(cacheKey, json.data[0]);
  return json.data[0];
}

/**
 * Resolve a card from ptcgoCode + number using the set map.
 * Falls back to name search if set-based lookup fails and name is provided.
 * @param {string} ptcgoCode - e.g. "SVI"
 * @param {string} number - e.g. "86"
 * @param {Map<string, string>} setMap - ptcgoCode → setId
 * @param {string} [name] - card name for fallback search
 * @returns {Promise<object>}
 */
export async function resolveCard(ptcgoCode, number, setMap, name) {
  let originalError;
  try {
    const setId = setMap.get(ptcgoCode);
    if (!setId) {
      throw new Error(`Unknown set code: ${ptcgoCode}`);
    }
    return await fetchCard(setId, number);
  } catch (err) {
    originalError = err;
  }

  if (name) {
    // For basic energy names, prefer SVE (Scarlet & Violet Energies) regular art
    // before the general newest-first fallback which can return special/gold prints.
    if (/\bEnergy$/i.test(name)) {
      try {
        const cacheKey = `bb:energy-sve:${name}`;
        const cached = cacheGet(cacheKey);
        if (cached) return cached;
        const res = await fetch(
          `${API_BASE}/cards?q=name:"${encodeURIComponent(name)}" set.id:sve&orderBy=number&pageSize=1`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.data?.length > 0) {
            cacheSet(cacheKey, json.data[0]);
            return json.data[0];
          }
        }
      } catch {
        // fall through to general search
      }
    }

    try {
      return await searchCardByName(name);
    } catch {
      // fallback also failed — fall through to re-throw original
    }
  }

  throw originalError;
}

/**
 * Search cards by name prefix, returning up to 20 results ordered by name.
 * @param {string} query - partial card name, e.g. "dragapult"
 * @returns {Promise<Array>}
 */
export async function searchCards(query) {
  if (!query || query.length < 2) return [];
  const res = await fetch(
    `${API_BASE}/cards?q=name:${encodeURIComponent(query)}*&orderBy=name&pageSize=20`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

/**
 * Fetch all known English prints for a card name, ordered by set release date.
 * @param {string} name - exact card name, e.g. "Dragapult ex"
 * @returns {Promise<Array>}
 */
export async function fetchPrintsByName(name) {
  const cacheKey = `bb:prints:${name}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${API_BASE}/cards?q=name:"${encodeURIComponent(name)}"&orderBy=set.releaseDate&pageSize=250`
  );
  if (!res.ok) throw new Error(`Failed to fetch prints for "${name}": ${res.status}`);

  const json = await res.json();
  const prints = json.data ?? [];
  cacheSet(cacheKey, prints);
  return prints;
}
