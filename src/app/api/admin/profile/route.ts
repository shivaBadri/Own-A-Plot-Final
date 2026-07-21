import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { profileSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  validationError,
  readJson,
} from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import { ROLE_LABELS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * Self-service only. There is deliberately no `id` parameter on this route:
 * every employee edits exactly their own record, whatever their role. Changing
 * somebody else's account goes through /api/employees/[id], which is
 * permission-gated and audited.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    jobTitle: user.jobTitle,
    mustChangePassword: user.mustChangePassword,
    permissions: [...user.permissions].sort(),
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await readJson(request);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { name, avatarUrl, currentPassword, newPassword } = parsed.data;

  const data: {
    name?: string;
    avatarUrl?: string;
    passwordHash?: string;
    mustChangePassword?: boolean;
  } = {};
  if (name !== undefined) data.name = name;
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

  try {
    if (newPassword) {
      const admin = await prisma.admin.findUnique({
        where: { id: user.id },
        select: { passwordHash: true },
      });
      const valid =
        admin &&
        currentPassword &&
        (await verifyPassword(currentPassword, admin.passwordHash));

      if (!valid) {
        return NextResponse.json(
          {
            error: "Current password is incorrect",
            fields: { currentPassword: ["Current password is incorrect"] },
          },
          { status: 401 }
        );
      }
      data.passwordHash = await hashPassword(newPassword);
      // Clears the forced-reset flag set by an administrative password reset.
      data.mustChangePassword = false;
    }

    const updated = await prisma.admin.update({
      where: { id: user.id },
      data,
      select: { id: true, name: true, email: true, avatarUrl: true },
    });

    await logActivity({
      actor: user,
      action: newPassword ? "profile.password_change" : "profile.update",
      entity: "Admin",
      entityId: user.id,
      summary: newPassword
        ? `${user.name} changed their own password`
        : `${user.name} updated their profile`,
      request,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
