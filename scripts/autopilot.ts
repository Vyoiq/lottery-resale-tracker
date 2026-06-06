import { runAutoPilot } from "@/services/operations/autoPilotRunner";
import { operationFailureMessage } from "@/lib/errorMessages";

async function main() {
  const result = await runAutoPilot(undefined, { force: true, trigger: "cli" });
  console.log(`autopilot finished: success=${result.success} skipped=${result.skipped}`);
  console.log(result.message);
}

main().catch((error) => {
  console.error(operationFailureMessage("Auto Pilot", error));
  process.exit(1);
});
