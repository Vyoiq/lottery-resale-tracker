import { runFullOperation } from "@/services/operations/operationRunner";

async function main() {
  const result = await runFullOperation();
  console.log(`operation finished: success=${result.success}`);
  console.log(result.message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
