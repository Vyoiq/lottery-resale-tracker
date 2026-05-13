import { runFullOperation } from "@/services/operations/operationRunner";
import { operationFailureMessage } from "@/lib/errorMessages";

async function main() {
  const result = await runFullOperation();
  console.log(`operation finished: success=${result.success}`);
  console.log(result.message);
}

main().catch((error) => {
  console.error(operationFailureMessage("一括実行", error));
  process.exit(1);
});
