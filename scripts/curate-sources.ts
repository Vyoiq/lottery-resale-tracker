import { runSourceCurator } from "@/services/sourceDiscovery/sourceCurator";
import { operationFailureMessage } from "@/lib/errorMessages";

async function main() {
  const result = await runSourceCurator();
  console.log("source curator finished");
  console.log(`checked=${result.checkedCount}`);
  console.log(`registeredWatch=${result.registeredWatchCount}`);
  console.log(`registeredPrice=${result.registeredPriceCount}`);
  console.log(`enabledWatch=${result.enabledWatchCount}`);
  console.log(`enabledPrice=${result.enabledPriceCount}`);
  console.log(`manualReview=${result.manualReviewCount}`);
  console.log(`ignore=${result.ignoreCount}`);
  console.log(`skipped=${result.skippedCount}`);
  if (result.skippedReasons.length > 0) {
    console.log("skipped reasons:");
    for (const reason of result.skippedReasons) console.log(`- ${reason}`);
  }
}

main().catch((error) => {
  console.error(operationFailureMessage("AI Source Curator", error));
  process.exit(1);
});
