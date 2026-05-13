import { operationFailureMessage } from "@/lib/errorMessages";
import { runCollectors } from "@/services/collectors/base";
import { runOperationTask } from "@/services/operations/operationRunner";

const dryRun = process.argv.includes("--dry-run") || process.env.npm_config_dry_run === "true";

async function main() {
  if (dryRun) {
    const run = await runCollectors({ dryRun: true });
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
    console.log(`collector finished: dryRun=true, new=${run.newListingCount}, updated=${run.updatedListingCount}, skipped=${run.skippedCount}, errors=${run.errorCount}`);
    if (run.errorMessage) console.log(`\nerror details:\n${run.errorMessage}`);
    if (run.errorCount > 0) process.exitCode = 1;
    return;
  }

  const operation = await runOperationTask("collect");
  console.log(`collector finished: success=${operation.success}`);
  console.log(operation.message);
  if (!operation.success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(operationFailureMessage("抽選情報収集", error));
  process.exit(1);
});
