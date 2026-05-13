import { operationFailureMessage } from "@/lib/errorMessages";
import { runOperationTask } from "@/services/operations/operationRunner";

async function main() {
  const result = await runOperationTask("notifications");
  console.log(`notification generation finished: success=${result.success}`);
  console.log(result.message);
  if (!result.success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(operationFailureMessage("通知生成", error));
  process.exit(1);
});
