import { runPriceCollectors } from "@/services/priceCollectors/base";

const dryRun = process.argv.includes("--dry-run") || process.env.npm_config_dry_run === "true";

runPriceCollectors({ dryRun })
  .then((run) => {
    if (dryRun && "items" in run) {
      console.log("[dry-run] DB保存は行いません。");
      for (const item of run.items) {
        console.log(`${item.productName} / ${item.shopName}: candidates=${item.count}, best=${item.best ?? "-"}, keywords=${item.keywords.join(" | ")}`);
      }
    }
    console.log(`price collector finished: dryRun=${dryRun}, target=${run.targetCount}, new=${run.newPriceCount}, updated=${run.updatedPriceCount}, errors=${run.errorCount}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
