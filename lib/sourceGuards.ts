export function isPlaceholderPriceSourceUrl(value: string | null | undefined) {
  if (!value) return false;
  return value.toLowerCase().includes("example.com");
}

export function isPlaceholderPriceSource(source: { baseUrl?: string | null; searchUrlTemplate?: string | null }) {
  return isPlaceholderPriceSourceUrl(source.baseUrl) || isPlaceholderPriceSourceUrl(source.searchUrlTemplate);
}
