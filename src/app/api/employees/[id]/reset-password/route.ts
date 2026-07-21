import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, hashPassword } from "@/lib/auth";
import { employeePasswordResetSchema } from "@/lib/validations";
import {
  handleApiError,
  validationError,
  readJson,
  forbidden,
  unauthorized,
} from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * Administrative password reset.
 *
 * Deliberately does NOT require the employee's current password — that is the
 * whole point of an administrative reset. What it does require is
 * `employees:edit`, an audit entry, and `mustChangePassword` on by default, so
 * the temporary credential the administrator hands over cannot quietly become
 * permanent.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("employees:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  const actor = guard.user;
  const { id } = await params;

  const body = await readJson(request);
  const parsed = employeePasswordResetSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const employee = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    if (employee.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
      return forbidden(
        "Only a Super Admin can reset another Super Admin's password."
      );
    }

    await prisma.admin.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(parsed.data.password),
        mustChangePassword: parsed.data.mustChangePassword,
      },
    });

    await logActivity({
      actor,
      action: "employee.password_reset",
      entity: "Admin",
      entityId: id,
      summary: `Reset the password for ${employee.name}`,
      metadata: { mustChangePassword: parsed.data.mustChangePassword },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
