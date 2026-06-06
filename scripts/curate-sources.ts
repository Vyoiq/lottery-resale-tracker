import { runSourceCurator } from "@/services/sourceDiscovery/sourceCurator";
import { runSafeSourceAutomation } from "@/services/sources/safeSourceAutomation";
import { operationFailureMessage } from "@/lib/errorMessages";

async function main() {
  const result = await runSourceCurator();
  console.log("source curator finished");
  console.log(`checked=${result.checkedCount}`);
  console.log(`basePriceSource=${result.basePriceSourceCount}`);
  console.log(`watchCandidate=${result.watchCandidateCount}`);
  console.log(`registeredWatch=${result.registeredWatchCount}`);
  console.log(`watchRegisterSuccess=${result.watchRegisterSuccessCount}`);
  console.log(`registeredPrice=${result.registeredPriceCount}`);
  console.log(`registeredBasePrice=${result.registeredBasePriceCount}`);
  console.log(`templateInferenceSuccess=${result.templateInferenceSuccessCount}`);
  console.log(`templateInferenceFailure=${result.templateInferenceFailureCount}`);
  console.log(`templateTestSuccess=${result.templateTestSuccessCount}`);
  console.log(`templateTestFailure=${result.templateTestFailureCount}`);
  console.log(`autoEnableCandidate=${result.autoEnableCandidateCount}`);
  console.log(`enabledWatch=${result.enabledWatchCount}`);
  console.log(`enabledPrice=${result.enabledPriceCount}`);
  console.log(`manualReview=${result.manualReviewCount}`);
  console.log(`ignore=${result.ignoreCount}`);
  console.log(`skipped=${result.skippedCount}`);
  if (result.skippedReasons.length > 0) {
    console.log("skipped reasons:");
    for (const reason of result.skippedReasons) console.log(`- ${reason}`);
  }
  if (result.autoEnableSkippedReasons.length > 0) {
    console.log("auto enable skipped reasons:");
    for (const reason of result.autoEnableSkippedReasons) console.log(`- ${reason}`);
  }

  const safe = await runSafeSourceAutomation();
  console.log("safe source automation finished");
  console.log(`checkedWatch=${safe.checkedWatchCount}`);
  console.log(`checkedPrice=${safe.checkedPriceCount}`);
  console.log(`autoEnabledWatch=${safe.watchAutoEnabledCount}`);
  console.log(`autoEnabledPrice=${safe.priceAutoEnabledCount}`);
  console.log(`autoDisabledWatch=${safe.watchAutoDisabledCount}`);
  console.log(`autoDisabledPrice=${safe.priceAutoDisabledCount}`);
  if (safe.enabledReasons.length > 0) {
    console.log("enabled reasons:");
    for (const reason of safe.enabledReasons) console.log(`- ${reason}`);
  }
  if (safe.skippedReasons.length > 0) {
    console.log("safe enable skipped reasons:");
    for (const reason of safe.skippedReasons) console.log(`- ${reason}`);
  }
  if (safe.disabledReasons.length > 0) {
    console.log("auto disabled reasons:");
    for (const reason of safe.disabledReasons) console.log(`- ${reason}`);
  }
}

main().catch((error) => {
  console.error(operationFailureMessage("AI Source Curator", error));
  process.exit(1);
});
