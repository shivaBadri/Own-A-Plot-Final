import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (user) {
    await logActivity({
      actor: user,
      action: "auth.logout",
      entity: "Admin",
      entityId: user.id,
      summary: `${user.name} signed out`,
      request,
    });
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
