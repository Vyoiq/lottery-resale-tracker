import { containsBox, normalizeProductName, productTokens } from "./normalizeProductName";

export function titleSimilarity(productName: string, candidateTitle: string) {
  const product = normalizeProductName(productName);
  const candidate = normalizeProductName(candidateTitle);
  if (!product || !candidate) return 0;
  if (product === candidate) return 1;
  if (product.includes(candidate) || candidate.includes(product)) return 0.85;

  const tokens = productTokens(productName);
  if (tokens.length === 0) return 0;
  const matched = tokens.filter((token) => candidate.includes(token));
  let score = matched.length / tokens.length;

  if (containsBox(productName) && containsBox(candidateTitle)) score += 0.12;
  if (/ヒロシマ|広島/i.test(productName) && /ヒロシマ|広島/i.test(candidateTitle)) score += 0.18;
  if (/ポケモンセンター|ポケセン/i.test(productName) && /ポケモンセンター|ポケセン/i.test(candidateTitle)) score += 0.12;

  return Math.min(1, score);
}

export function isLikelySameProduct(productName: string, candidateTitle: string) {
  return titleSimilarity(productName, candidateTitle) >= 0.32;
}
