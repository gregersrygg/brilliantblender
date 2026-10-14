// Comparison key for exact card-name matching: ignores case, accents, and apostrophe/dash variants.
export function cardNameKey(name) {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function sameCardName(a, b) {
  return cardNameKey(a) === cardNameKey(b);
}
