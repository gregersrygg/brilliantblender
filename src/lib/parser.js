const SECTION_RE = /^(Pokémon|Pokemon|Trainer|Energy)\s*:\s*(\d+)\s*$/i;
const CARD_RE = /^(\d+)\s+(.+?)\s+([A-Za-z]{2,6})\s+(\d+)\s*$/;
const TOTAL_RE = /^Total Cards\s*:\s*\d+\s*$/i;

/**
 * Parse a PTCGL-format decklist into structured sections.
 * @param {string} text - Raw decklist text
 * @returns {{ sections: Array<{ name: string, count: number, cards: Array }>, totalCount: number }}
 */
export function parseDeck(text) {
  const lines = text.split('\n');
  const sections = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') continue;
    if (TOTAL_RE.test(line)) continue;

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      current = { name: normalizeSectionName(sectionMatch[1]), count: 0, cards: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { name: 'Unknown', count: 0, cards: [] };
      sections.push(current);
    }

    const cardMatch = line.match(CARD_RE);
    if (cardMatch) {
      const qty = parseInt(cardMatch[1], 10);
      current.cards.push({
        qty,
        name: cardMatch[2],
        setCode: cardMatch[3],
        number: cardMatch[4],
      });
      current.count += qty;
    } else {
      current.cards.push({
        qty: 0,
        name: line,
        setCode: '',
        number: '',
        error: true,
      });
    }
  }

  const totalCount = sections.reduce((sum, s) => sum + s.count, 0);
  return { sections, totalCount };
}

function normalizeSectionName(name) {
  const lower = name.toLowerCase();
  if (lower === 'pokemon' || lower === 'pokémon') return 'Pokémon';
  if (lower === 'trainer') return 'Trainer';
  if (lower === 'energy') return 'Energy';
  return name;
}
