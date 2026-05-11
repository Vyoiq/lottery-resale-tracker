import { normalizeProductName } from "./normalizeProductName";

function uniq(values: string[]) {
  return [...new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))];
}

function detectPokemonCenterPlace(name: string) {
  const match = name.match(/ポケモンセンター([ァ-ヶー一-龠A-Za-z0-9]+)/);
  if (!match) return null;
  return {
    full: `ポケモンセンター${match[1]}`,
    short: `ポケセン${match[1]}`,
    place: match[1]
  };
}

export function generateSearchKeywords(productName: string) {
  const normalized = normalizeProductName(productName);
  const place = detectPokemonCenterPlace(productName);
  const hasSpecialBox = /スペシャル\s*box|スペシャルBOX/i.test(productName) || normalized.includes("スペシャル box");
  const keywords: string[] = [productName];

  if (place && hasSpecialBox) {
    keywords.push(`${place.full} スペシャルBOX`);
    keywords.push(`スペシャルBOX ${place.full}`);
    keywords.push(`${place.short} スペシャルBOX`);
    keywords.push(`${place.place}BOX`);
    keywords.push(place.full);
    keywords.push(`スペシャルBOX ${place.place}`);
  }

  if (hasSpecialBox) keywords.push("スペシャルBOX");
  keywords.push(normalized.replace(/\bbox\b/g, "BOX"));

  return uniq(keywords).slice(0, 8);
}
