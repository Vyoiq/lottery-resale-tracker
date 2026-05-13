import { operationFailureMessage } from "@/lib/errorMessages";
import { runOperationTask } from "@/services/operations/operationRunner";
import { runPriceCollectors } from "@/services/priceCollectors/base";

const dryRun = process.argv.includes("--dry-run") || process.env.npm_config_dry_run === "true";

async function main() {
  if (dryRun) {
    const run = await runPriceCollectors({ dryRun: true });
    if ("items" in run) {
      console.log("[dry-run] DB保存は行いません。");
      for (const item of run.items) {
        console.log(`${item.productName} / ${item.shopName}: candidates=${item.count}, best=${item.best ?? "-"}, keywords=${item.keywords.join(" | ")}`);
      }
    }
    console.log(`price collector finished: dryRun=true, target=${run.targetCount}, new=${run.newPriceCount}, updated=${run.updatedPriceCount}, errors=${run.errorCount}`);
    if (run.errorMessage) console.log(`\nerror details:\n${run.errorMessage}`);
    if (run.errorCount > 0) process.exitCode = 1;
    return;
  }

  const operation = await runOperationTask("price_collect");
  console.log(`price collector finished: success=${operation.success}`);
  console.log(operation.message);
  if (!operation.success) process.exitCode = 1;
}

main().catch((error) => {
  console.error(operationFailureMessage("価格取得", error));
  process.exit(1);
});
