import type { WatchSource } from "@prisma/client";
import type { NormalizedListing, RawListingCandidate } from "./normalize";

export type SourceCollectResult = {
  source: Pick<WatchSource, "id" | "name" | "storeName" | "url" | "type">;
  httpStatus?: number;
  fetchedCount: number;
  matchedKeywords: string[];
  candidates: RawListingCandidate[];
  listings: NormalizedListing[];
};

export type RunCollectorsOptions = {
  dryRun?: boolean;
};
