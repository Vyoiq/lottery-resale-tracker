import type { DiscoveryQuery } from "@prisma/client";
import type { DiscoveryCandidate } from "../queryBuilder";

export type SearchProviderContext = {
  mode: "all" | "price";
};

export type SearchProviderResult = {
  providerName: string;
  candidates: DiscoveryCandidate[];
  skipped: boolean;
  message?: string;
};

export type SearchProvider = {
  name: string;
  discover: (
    query: Pick<DiscoveryQuery, "query" | "type" | "category">,
    context: SearchProviderContext
  ) => Promise<SearchProviderResult>;
};
