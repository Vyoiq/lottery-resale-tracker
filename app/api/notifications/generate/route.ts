import { NextResponse } from "next/server";
import { generateNotifications } from "@/services/notifications/generateNotifications";

export async function POST() {
  const result = await generateNotifications();
  return NextResponse.json(result);
}
