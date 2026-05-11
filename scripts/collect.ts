import { runCollectors } from "@/services/collectors/base";

const dryRun = process.argv.includes("--dry-run") || process.env.npm_config_dry_run === "true";

runCollectors({ dryRun })
  .then((run) => {
    if (dryRun) {
      console.log("[dry-run] DB保存は行いません。");
      for (const item of run.items ?? []) {
        console.log(`\n[${item.success ? "success" : "error"}] ${item.sourceName}`);
        console.log(`url=${item.sourceUrl}`);
        console.log(`http=${item.httpStatus ?? "-"} fetched=${item.fetchedCount} keywords=${item.matchedKeywords.join(", ") || "-"}`);
        if (item.errorMessage) console.log(`error=${item.errorMessage}`);
        for (const listing of item.listings ?? []) {
          console.log(`- ${listing.title}`);
          console.log(`  product=${listing.productName}`);
          console.log(`  url=${listing.lotteryUrl}`);
          console.log(`  score=${listing.confidenceScore} reason=${listing.confidenceReason}`);
          console.log(`  dates=${listing.extractedDatesRaw || "-"}`);
        }
      }
    }
    console.log(`collector finished: dryRun=${dryRun}, new=${run.newListingCount}, updated=${run.updatedListingCount}, skipped=${run.skippedCount}, errors=${run.errorCount}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
