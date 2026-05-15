import { operationFailureMessage } from "@/lib/errorMessages";
import { runOperationTask } from "@/services/operations/operationRunner";

async function main() {
  const operation = await runOperationTask("price_source_discovery");
  console.log(`price source discovery finished: success=${operation.success}`);
  console.log(operation.message);
  if (!operation.success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(operationFailureMessage("価格ソース自動発見", error));
  process.exit(1);
});
