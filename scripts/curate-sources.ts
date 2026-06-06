import { runSourceCurator } from "@/services/sourceDiscovery/sourceCurator";
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
}

main().catch((error) => {
  console.error(operationFailureMessage("AI Source Curator", error));
  process.exit(1);
});
