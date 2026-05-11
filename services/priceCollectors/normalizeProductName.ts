const removablePhrases = [
  "ポケモンカードゲーム",
  "スカーレット&バイオレット",
  "スカーレット＆バイオレット",
  "強化拡張パック",
  "拡張パック",
  "未開封"
];

export function normalizeProductName(value: string) {
  let normalized = value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[【】\[\]（）()「」『』]/g, " ")
    .replace(/[|｜/／・:：,，.。]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const phrase of removablePhrases) {
    normalized = normalized.replaceAll(phrase.toLowerCase().normalize("NFKC"), " ");
  }

  normalized = normalized
    .replace(/\bbox\b/g, " box ")
    .replace(/ボックス/g, " box ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized;
}

export function productTokens(value: string) {
  return normalizeProductName(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function containsBox(value: string) {
  const normalized = normalizeProductName(value);
  return normalized.includes("box") || normalized.includes("スペシャルbox");
}
