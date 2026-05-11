const japaneseDate = /(?:(20\d{2})年)?\s*(\d{1,2})月\s*(\d{1,2})日/g;
const slashDate = /(20\d{2})[/-](\d{1,2})[/-](\d{1,2})/g;

function toDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function yearForMonthDay(month: number, day: number) {
  const now = new Date();
  const candidate = toDate(now.getFullYear(), month, day);
  if (!candidate) return now.getFullYear();
  if (candidate.getTime() < now.getTime() - 14 * 24 * 60 * 60 * 1000) return now.getFullYear() + 1;
  return now.getFullYear();
}

export function extractDates(text: string) {
  return extractDateMatches(text).map((item) => item.date);
}

export function extractDateMatches(text: string) {
  const matches: { raw: string; date: Date }[] = [];

  for (const match of text.matchAll(slashDate)) {
    const date = toDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (date) matches.push({ raw: match[0], date });
  }

  for (const match of text.matchAll(japaneseDate)) {
    const year = match[1] ? Number(match[1]) : yearForMonthDay(Number(match[2]), Number(match[3]));
    const date = toDate(year, Number(match[2]), Number(match[3]));
    if (date) matches.push({ raw: match[0], date });
  }

  const unique = [...new Map(matches.map((item) => [`${item.date.toISOString().slice(0, 10)}:${item.raw}`, item])).values()];
  unique.sort((a, b) => a.date.getTime() - b.date.getTime());
  return unique;
}

export function extractListingDates(text: string) {
  const dateMatches = extractDateMatches(text);
  const dates = dateMatches.map((item) => item.date);
  const lower = text.toLowerCase();
  const first = dates[0] ?? null;
  const last = dates[dates.length - 1] ?? null;

  return {
    applicationStartAt: lower.includes("受付期間") || lower.includes("応募期間") ? first : null,
    applicationEndAt: lower.includes("締切") || lower.includes("まで") || lower.includes("受付期間") || lower.includes("応募期間") ? last : first,
    resultAnnouncementAt: lower.includes("当選発表") ? last : null,
    purchaseDeadlineAt: lower.includes("購入期限") ? last : null,
    raw: dateMatches.map((item) => item.raw)
  };
}
