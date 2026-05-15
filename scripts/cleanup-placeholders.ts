import { cleanupPlaceholderSources } from "@/services/sources/placeholderCleanup";

async function main() {
  const result = await cleanupPlaceholderSources();
  console.log(`disabled WatchSource: ${result.disabledWatchSourceCount}`);
  console.log(`disabled PriceSource: ${result.disabledPriceSourceCount}`);
  console.log(result.message);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
