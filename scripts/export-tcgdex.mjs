#!/usr/bin/env node
// Imports third-party TS modules from tcgdex/cards-database, so it runs in its own secret-less CI
// job and only hands JSON to the snapshot build. Run with tsx: `npm run snapshot:tcgdex`.

import { readdirSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { SUPPLEMENT_SETS, localize } from './tcgdex-supplement.mjs';

const REPO_URL = 'https://github.com/tcgdex/cards-database.git';
const out = resolve(process.argv[2] ?? 'tcgdex-promos.json');

const load = async file => localize((await import(pathToFileURL(file).href)).default);

const tmp = mkdtempSync(join(tmpdir(), 'tcgdex-data-'));
try {
  console.log('Cloning tcgdex/cards-database (shallow, sparse)...');
  execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', REPO_URL, tmp], { stdio: 'pipe' });
  execFileSync('git', ['-C', tmp, 'sparse-checkout', 'set', ...SUPPLEMENT_SETS.map(d => d.dir)], { stdio: 'pipe' });

  const sets = [];
  for (const def of SUPPLEMENT_SETS) {
    const set = await load(join(tmp, `${def.dir}.ts`));
    const cards = [];
    for (const file of readdirSync(join(tmp, def.dir)).filter(f => /^\d+\.ts$/.test(f))) {
      const { set: _set, ...card } = await load(join(tmp, def.dir, file));
      cards.push({ ...card, localId: file.replace('.ts', '') });
    }
    sets.push({ setId: def.setId, releaseDate: set.releaseDate, cards });
    console.log(`  ${def.setId}: ${cards.length} cards`);
  }
  writeFileSync(out, JSON.stringify(sets));
  console.log(`Written to ${out}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
