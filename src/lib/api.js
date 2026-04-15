const API_BASE = 'https://api.pokemontcg.io/v2';
const API_KEY = import.meta.env.VITE_POKEMONTCG_API_KEY;

function apiFetch(url) {
  return fetch(url, API_KEY ? { headers: { 'X-Api-Key': API_KEY } } : undefined);
}

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

  const res = await apiFetch(`${API_BASE}/sets?pageSize=250`);
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

  const res = await apiFetch(`${API_BASE}/cards/${cardId}`);
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

  const res = await apiFetch(`${API_BASE}/cards?q=name:"${encodeURIComponent(name)}"&orderBy=-set.releaseDate&pageSize=1`);
  if (!res.ok) throw new Error(`Failed to search for card "${name}": ${res.status}`);

  const json = await res.json();
  if (!json.data || json.data.length === 0) {
    throw new Error(`No results found for card name: "${name}"`);
  }

  cacheSet(cacheKey, json.data[0]);
  return json.data[0];
}

/**
 * Reverse-lookup: given a setId (e.g. "sve"), return the ptcgoCode (e.g. "SVE")
 * from the cached sets data.  Returns null when the cache is empty or no match.
 * @param {string} setId
 * @returns {string|null}
 */
export function getPtcgoCode(setId) {
  if (!setId) return null;
  const cached = cacheGet('bb:sets');
  if (!cached) return null;
  const entry = cached.find(([, id]) => id === setId);
  return entry ? entry[0] : null;
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

const ALT_ART_RARITIES = new Set([
  'Illustration Rare',
  'Special Illustration Rare',
  'Hyper Rare',
  'Rainbow Rare',
]);

/**
 * Fetch the newest Standard-legal, non-alt-art print for a Trainer or special Energy.
 * Used to normalise deck imports so trainer/energy cards always resolve to the most
 * recent printable version regardless of which set code appeared in the import string.
 * @param {string} name
 * @param {string[]} legalMarks - regulation marks considered Standard-legal
 * @returns {Promise<object>}
 */
export async function fetchNewestLegalPrint(name, legalMarks) {
  const cacheKey = `bb:legal-print:${name}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${API_BASE}/cards?q=name:"${encodeURIComponent(name)}"&orderBy=-set.releaseDate&pageSize=30`
  );
  if (!res.ok) throw new Error(`Failed to fetch prints for "${name}": ${res.status}`);

  const json = await res.json();
  const result = (json.data ?? []).find(p => {
    if (!legalMarks.includes(p.regulationMark)) return false;
    if (ALT_ART_RARITIES.has(p.rarity)) return false;
    const num = parseInt(p.number, 10);
    return !isNaN(num) && num <= (p.set?.printedTotal ?? 0);
  });
  if (!result) throw new Error(`No legal print found for "${name}"`);

  cacheSet(cacheKey, result);
  return result;
}

/**
 * Fetch the canonical SVE basic energy card by its API name (e.g. "Grass Energy").
 * @param {string} apiName
 * @returns {Promise<object>}
 */
export async function fetchBasicEnergyFromSve(apiName) {
  const cacheKey = `bb:basic-energy:${apiName}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await apiFetch(
    `${API_BASE}/cards?q=name:"${encodeURIComponent(apiName)}" set.id:sve&orderBy=number&pageSize=1`
  );
  if (!res.ok) throw new Error(`Failed to fetch basic energy "${apiName}": ${res.status}`);

  const json = await res.json();
  if (!json.data?.length) throw new Error(`No SVE print found for "${apiName}"`);

  cacheSet(cacheKey, json.data[0]);
  return json.data[0];
}

/**
 * Search cards by name prefix, returning up to 20 results ordered by name.
 * @param {string} query - partial card name, e.g. "dragapult"
 * @returns {Promise<Array>}
 */
export async function searchCards(query) {
  if (!query || query.length < 2) return [];

  const terms = query
    .trim()
    .split(/\s+/)
    .map(word => {
      const w = word.toLowerCase();
      // Strip trailing 's' from long words so "marnies" → "marnie" aligns with
      // the API's apostrophe-splitting tokeniser ("Marnie's" → token "marnie").
      // Guard: word must be ≥6 chars and not end in double-s (e.g. "boss").
      if (w.length >= 6 && w.endsWith('s') && w[w.length - 2] !== 's') {
        return w.slice(0, -1);
      }
      return w;
    });

  // Multi-term AND query: name:word1* name:word2* — fixes spaces and apostrophes
  const q = terms.map(t => `name:${t}*`).join(' ');
  // Preserve * as wildcard (encodeURIComponent would otherwise encode it as %2A)
  const encoded = encodeURIComponent(q).replace(/%2A/gi, '*');

  const res = await apiFetch(`${API_BASE}/cards?q=${encoded}&orderBy=-set.releaseDate&pageSize=20`);
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
  const prints = (json.data ?? []).filter(p => p.name === name);
  cacheSet(cacheKey, prints);
  return prints;
}
