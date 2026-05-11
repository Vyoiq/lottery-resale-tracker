export const sourceTypes = ["html", "rss", "other"] as const;
export type SourceType = (typeof sourceTypes)[number];

export const listingStatuses = ["active", "ended", "unknown", "ignored"] as const;
export type ListingStatus = (typeof listingStatuses)[number];

export const userVerdicts = ["good", "wrong_price", "wrong_product", "low_interest", "expired", "duplicate", "other"] as const;
export type UserVerdict = (typeof userVerdicts)[number];

export const applicationStatuses = ["not_applied", "applied", "won", "lost", "purchased", "sold", "skipped"] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];
