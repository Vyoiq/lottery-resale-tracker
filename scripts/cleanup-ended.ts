import { operationFailureMessage } from "@/lib/errorMessages";
import { runOperationTask } from "@/services/operations/operationRunner";

async function main() {
  const operation = await runOperationTask("cleanup_ended");
  console.log(`cleanup ended finished: success=${operation.success}`);
  console.log(operation.message);
  if (!operation.success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(operationFailureMessage("終了済み再判定", error));
  process.exit(1);
});
