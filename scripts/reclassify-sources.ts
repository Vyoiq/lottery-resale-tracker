import { reclassifySourcesAndListings } from "../services/discoveryClassification/reclassify";
import { prisma } from "../lib/prisma";

async function main() {
  const result = await reclassifySourcesAndListings(prisma);
  await prisma.operationRun.create({
    data: {
      type: "reclassify_sources",
      startedAt: new Date(),
      finishedAt: new Date(),
      success: true,
      message: `DiscoveredSource ${result.discoveredChecked} 件中 ${result.discoveredUpdated} 件更新 / LotteryListing ${result.listingChecked} 件中 ${result.listingUpdated} 件更新`
    }
  });
  console.log(`DiscoveredSource ${result.discoveredChecked} checked / ${result.discoveredUpdated} updated`);
  console.log(`LotteryListing ${result.listingChecked} checked / ${result.listingUpdated} updated`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
