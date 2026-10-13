#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { buildSupplement, SUPPLEMENT_SETS } from './tcgdex-supplement.mjs';

const LEGAL_MARKS = ['H', 'I', 'J'];
const REPO_URL = 'https://github.com/PokemonTCG/pokemon-tcg-data.git';
// Codes other tools (e.g. Limitless) export that differ from the upstream ptcgoCode.
const SET_CODE_ALIASES = { SVP: 'svp' };
// Written by export-tcgdex.mjs (a separate, secret-less CI job); see docs/architecture.md.
const TCGDEX_EXPORT = resolve(process.argv[2] ?? 'tcgdex-promos.json');

// Upstream mislabels these chase printings; correct so search hides them by default.
const RARITY_OVERRIDES = {
  'me55-R': 'RGB Rare',
  'me55-G': 'RGB Rare',
  'me55-B': 'RGB Rare',
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../src/data');

function trimCard(card, set) {
  return {
    id: card.id,
    name: card.name,
    number: card.number,
    supertype: card.supertype,
    subtypes: card.subtypes ?? [],
    hp: card.hp ?? null,
    types: card.types ?? [],
    weaknesses: card.weaknesses ?? [],
    resistances: card.resistances ?? [],
    convertedRetreatCost: card.convertedRetreatCost ?? 0,
    attacks: card.attacks ?? [],
    abilities: card.abilities ?? [],
    evolvesFrom: card.evolvesFrom ?? null,
    regulationMark: card.regulationMark ?? null,
    rarity: RARITY_OVERRIDES[card.id] ?? card.rarity ?? null,
    rules: card.rules ?? [],
    legalities: card.legalities ?? {},
    set: {
      id: set.id,
      ptcgoCode: set.ptcgoCode ?? null,
      name: set.name,
      releaseDate: set.releaseDate,
      printedTotal: set.printedTotal,
    },
    images: {
      small: card.images?.small ?? null,
      large: card.images?.large ?? null,
    },
  };
}

function main() {
  const tmp = mkdtempSync(join(tmpdir(), 'ptcg-data-'));
  console.log('Cloning pokemon-tcg-data (shallow)...');
  execSync(`git clone --depth 1 ${REPO_URL} ${tmp}`, { stdio: 'pipe' });

  console.log('Reading sets...');
  const setsRaw = JSON.parse(readFileSync(join(tmp, 'sets/en.json'), 'utf8'));
  const setsById = {};
  const seen = {};
  for (const set of setsRaw) {
    setsById[set.id] = set;
    if (set.ptcgoCode) {
      const existing = seen[set.ptcgoCode];
      if (!existing || set.id.length < existing.length) {
        seen[set.ptcgoCode] = set.id;
      }
    }
  }
  console.log(`  ${Object.keys(seen).length} sets with ptcgoCode`);

  console.log('Reading card files...');
  const cardsDir = join(tmp, 'cards/en');
  const files = readdirSync(cardsDir).filter(f => f.endsWith('.json'));

  const cardsById = {};
  const byName = new Map();
  let legalCount = 0;
  let sveEnergyCount = 0;

  for (const file of files) {
    const setId = file.replace('.json', '');
    const set = setsById[setId];
    if (!set) continue;
    const cards = JSON.parse(readFileSync(join(cardsDir, file), 'utf8'));
    for (const card of cards) {
      if (!byName.has(card.name)) byName.set(card.name, []);
      byName.get(card.name).push(trimCard(card, set));
      const isLegal = LEGAL_MARKS.includes(card.regulationMark);
      const isSveEnergy = setId === 'sve' && card.supertype === 'Energy';
      if (isLegal || isSveEnergy) {
        cardsById[card.id] = trimCard(card, set);
        if (isLegal) legalCount++;
        if (isSveEnergy) sveEnergyCount++;
      }
    }
  }

  console.log(`  ${legalCount} legal cards`);
  console.log(`  ${sveEnergyCount} SVE energy cards`);

  try {
    const exported = JSON.parse(readFileSync(TCGDEX_EXPORT, 'utf8'));
    const { cards, codes } = buildSupplement({ exported, cardsById, setsById, byName, legalMarks: LEGAL_MARKS });
    for (const card of cards) cardsById[card.id] = card;
    for (const [code, id] of codes) seen[code] = id;
  } catch (err) {
    // Keep the previously snapshotted supplement rather than dropping those cards.
    console.log(`::warning::TCGdex supplement failed, carrying over previous cards: ${err.message}`);
    const supplementIds = new Set(SUPPLEMENT_SETS.map(d => d.setId));
    const prevCards = JSON.parse(readFileSync(resolve(dataDir, 'cards.json'), 'utf8'));
    for (const card of Object.values(prevCards)) {
      if (supplementIds.has(card.set?.id) && !cardsById[card.id]) {
        cardsById[card.id] = card;
        if (card.set.ptcgoCode && !seen[card.set.ptcgoCode]) seen[card.set.ptcgoCode] = card.set.id;
      }
    }
  }
  for (const [code, id] of Object.entries(SET_CODE_ALIASES)) {
    if (!seen[code]) seen[code] = id;
  }

  const cardCount = Object.keys(cardsById).length;
  console.log(`\nTotal unique cards: ${cardCount}`);

  const setEntries = Object.entries(seen);
  writeFileSync(resolve(dataDir, 'sets.json'), JSON.stringify(setEntries));
  writeFileSync(resolve(dataDir, 'cards.json'), JSON.stringify(cardsById));
  writeFileSync(resolve(dataDir, 'snapshot-meta.json'), JSON.stringify({
    regulationMarks: LEGAL_MARKS,
    cardCount,
  }, null, 2));

  const cardsSizeKb = Math.round(Buffer.byteLength(JSON.stringify(cardsById)) / 1024);
  console.log(`Written to ${dataDir}/`);
  console.log(`  cards.json: ${cardsSizeKb} KB`);
  console.log(`  sets.json: ${Math.round(Buffer.byteLength(JSON.stringify(setEntries)) / 1024)} KB`);

  rmSync(tmp, { recursive: true, force: true });
  console.log('Done.');
}

main();
