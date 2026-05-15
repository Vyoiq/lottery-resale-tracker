import { runOperationTask } from "../services/operations/operationRunner";

async function main() {
  const operation = await runOperationTask("ai_classification");
  console.log(operation.message);
  process.exit(operation.success ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
