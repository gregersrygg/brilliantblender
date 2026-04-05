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
  const entries = [];
  for (const set of json.data) {
    if (set.ptcgoCode) {
      entries.push([set.ptcgoCode, set.id]);
    }
  }

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
 * Resolve a card from ptcgoCode + number using the set map.
 * @param {string} ptcgoCode - e.g. "SVI"
 * @param {string} number - e.g. "86"
 * @param {Map<string, string>} setMap - ptcgoCode → setId
 * @returns {Promise<object>}
 */
export async function resolveCard(ptcgoCode, number, setMap) {
  const setId = setMap.get(ptcgoCode);
  if (!setId) {
    throw new Error(`Unknown set code: ${ptcgoCode}`);
  }
  return fetchCard(setId, number);
}
