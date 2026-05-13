import { NextResponse } from "next/server";
import { generateNotifications } from "@/services/notifications/generateNotifications";
import { apiErrorBody } from "@/lib/errorMessages";

export async function POST() {
  try {
    const result = await generateNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(apiErrorBody("通知生成", error), { status: 500 });
  }
}
