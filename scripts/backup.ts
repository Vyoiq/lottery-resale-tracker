import { runOperationTask } from "@/services/operations/operationRunner";
import { operationFailureMessage } from "@/lib/errorMessages";

async function main() {
  const result = await runOperationTask("backup");
  console.log(`backup finished: success=${result.success}`);
  console.log(result.message);
  if (!result.success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(operationFailureMessage("バックアップ", error));
  process.exit(1);
});
