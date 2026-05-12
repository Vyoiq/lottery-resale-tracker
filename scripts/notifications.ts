import { generateNotifications } from "@/services/notifications/generateNotifications";

async function main() {
  const result = await generateNotifications();
  console.log("Notification generation finished");
  console.log(`Checked listings: ${result.checkedCount}`);
  console.log(`Notification candidates: ${result.candidateCount}`);
  console.log(`Created: ${result.createdCount}`);
  console.log(`Updated: ${result.updatedCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
