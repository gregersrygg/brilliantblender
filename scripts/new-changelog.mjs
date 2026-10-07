import { existsSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ADJECTIVES = [
  'brave', 'calm', 'eager', 'fancy', 'gentle', 'happy', 'jolly', 'kind', 'lively', 'merry',
  'nimble', 'proud', 'quick', 'quiet', 'shiny', 'silly', 'swift', 'tidy', 'witty', 'zesty',
  'bold', 'bright', 'clever', 'cosy', 'daring', 'fuzzy', 'golden', 'lucky', 'mighty', 'sunny',
];
const NOUNS = [
  'otters', 'badgers', 'comets', 'dragons', 'falcons', 'foxes', 'geckos', 'herons', 'koalas', 'lemurs',
  'meadows', 'newts', 'owls', 'pandas', 'pebbles', 'rivers', 'robins', 'sparks', 'tigers', 'walruses',
  'acorns', 'beacons', 'clouds', 'embers', 'ferns', 'harbors', 'lanterns', 'maples', 'puffins', 'willows',
];

const pick = (list, rand) => list[Math.floor(rand() * list.length)];

/** Return a random `<adj>-<adj>-<noun>.txt` name for which `taken(name)` is false. */
export function newFragmentName(taken, rand = Math.random, maxTries = 100) {
  for (let i = 0; i < maxTries; i++) {
    const a = pick(ADJECTIVES, rand);
    const name = `${a}-${pick(ADJECTIVES.filter((x) => x !== a), rand)}-${pick(NOUNS, rand)}.txt`;
    if (!taken(name)) return name;
  }
  throw new Error(`changelog: no free fragment name after ${maxTries} tries`);
}

/** Write `text` as a new one-line fragment in `dir` and return its path. */
export function writeFragment(dir, text, rand = Math.random) {
  const item = String(text ?? '').trim();
  if (!item) throw new Error('changelog: item text is empty');
  if (/[\r\n]/.test(item)) throw new Error('changelog: item text must be a single line — add one fragment per change');
  const file = join(dir, newFragmentName((name) => existsSync(join(dir, name)), rand));
  writeFileSync(file, `${item}\n`, { flag: 'wx' });
  return file;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const dir = fileURLToPath(new URL('../changelog', import.meta.url));
    console.log(relative(process.cwd(), writeFragment(dir, process.argv.slice(2).join(' '))));
  } catch (err) {
    console.error(err.message);
    console.error('Usage: npm run changelog -- "What a player would notice"');
    process.exit(1);
  }
}
