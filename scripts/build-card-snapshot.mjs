#!/usr/bin/env node

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const API_BASE = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.VITE_POKEMONTCG_API_KEY;
const LEGAL_MARKS = ['H', 'I', 'J'];

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');

async function apiFetch(url) {
  const headers = API_KEY ? { 'X-Api-Key': API_KEY } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

function trimCard(card) {
  return {
    id: card.id,
    name: card.name,
    number: card.number,
    supertype: card.supertype,
    subtypes: card.subtypes ?? [],
    hp: card.hp ?? null,
    attacks: card.attacks ?? [],
    abilities: card.abilities ?? [],
    evolvesFrom: card.evolvesFrom ?? null,
    regulationMark: card.regulationMark ?? null,
    rarity: card.rarity ?? null,
    rules: card.rules ?? [],
    legalities: card.legalities ?? {},
    set: {
      id: card.set.id,
      ptcgoCode: card.set.ptcgoCode ?? null,
      name: card.set.name,
      releaseDate: card.set.releaseDate,
      printedTotal: card.set.printedTotal,
    },
    images: {
      small: card.images?.small ?? null,
      large: card.images?.large ?? null,
    },
  };
}

async function fetchAllPages(baseUrl) {
  const cards = [];
  let page = 1;
  while (true) {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${sep}pageSize=250&page=${page}`;
    console.log(`  Fetching page ${page}...`);
    const json = await apiFetch(url);
    cards.push(...json.data);
    if (cards.length >= json.totalCount) break;
    page++;
  }
  return cards;
}

async function main() {
  console.log('Fetching sets...');
  const setsJson = await apiFetch(`${API_BASE}/sets?pageSize=250`);
  const seen = {};
  for (const set of setsJson.data) {
    if (set.ptcgoCode) {
      const existing = seen[set.ptcgoCode];
      if (!existing || set.id.length < existing.length) {
        seen[set.ptcgoCode] = set.id;
      }
    }
  }
  const setEntries = Object.entries(seen);
  console.log(`  ${setEntries.length} sets with ptcgoCode`);

  console.log('Fetching Standard-legal cards...');
  const marksQuery = LEGAL_MARKS.map(m => `regulationMark:${m}`).join(' OR ');
  const legalCards = await fetchAllPages(
    `${API_BASE}/cards?q=(${marksQuery})`
  );
  console.log(`  ${legalCards.length} legal cards`);

  console.log('Fetching SVE basic energies...');
  const sveJson = await apiFetch(
    `${API_BASE}/cards?q=set.id:sve supertype:Energy&pageSize=250`
  );
  const sveCards = sveJson.data;
  console.log(`  ${sveCards.length} SVE energy cards`);

  const cardsById = {};
  for (const card of [...legalCards, ...sveCards]) {
    if (!card.set) continue;
    cardsById[card.id] = trimCard(card);
  }

  const cardCount = Object.keys(cardsById).length;
  console.log(`\nTotal unique cards: ${cardCount}`);

  writeFileSync(resolve(dataDir, 'sets.json'), JSON.stringify(setEntries));
  writeFileSync(resolve(dataDir, 'cards.json'), JSON.stringify(cardsById));
  writeFileSync(resolve(dataDir, 'snapshot-meta.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    regulationMarks: LEGAL_MARKS,
    cardCount,
  }, null, 2));

  const cardsSizeKb = Math.round(Buffer.byteLength(JSON.stringify(cardsById)) / 1024);
  console.log(`Written to ${dataDir}/`);
  console.log(`  cards.json: ${cardsSizeKb} KB`);
  console.log(`  sets.json: ${Math.round(Buffer.byteLength(JSON.stringify(setEntries)) / 1024)} KB`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
