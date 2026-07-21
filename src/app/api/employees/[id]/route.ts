import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { employeeUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  validationError,
  readJson,
  forbidden,
  unauthorized,
} from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import { revalidateEmployees } from "@/lib/cache";
import { isPermission, ROLE_LABELS, type Role } from "@/lib/permissions";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  phone: true,
  jobTitle: true,
  lastLoginAt: true,
  lastLoginIp: true,
  mustChangePassword: true,
  permissionGrants: true,
  permissionRevokes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.AdminSelect;

/** There must always be at least one active Super Admin who can undo things. */
async function otherActiveSuperAdmins(excludeId: string) {
  return prisma.admin.count({
    where: { role: "SUPER_ADMIN", isActive: true, id: { not: excludeId } },
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const guard = await requirePermission("employees:view");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  const { id } = await params;

  try {
    const employee = await prisma.admin.findUnique({
      where: { id },
      select: EMPLOYEE_SELECT,
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }
    return NextResponse.json(employee);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("employees:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  const actor = guard.user;
  const { id } = await params;
  const body = await readJson(request);
  const parsed = employeeUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;

  try {
    const existing = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    // --- Escalation and lockout fences -------------------------------------

    // Only a Super Admin may touch a Super Admin, or mint a new one.
    if (
      (existing.role === "SUPER_ADMIN" || data.role === "SUPER_ADMIN") &&
      actor.role !== "SUPER_ADMIN"
    ) {
      return forbidden("Only a Super Admin can modify a Super Admin account.");
    }

    // Nobody demotes or disables themselves out of the room they are standing
    // in. Without this, the last Super Admin can lock the company out of its
    // own admin panel with two clicks and no way back.
    if (existing.id === actor.id) {
      if (data.role && data.role !== existing.role) {
        return forbidden("You cannot change your own role.");
      }
      if (data.isActive === false) {
        return forbidden("You cannot deactivate your own account.");
      }
    }

    // Removing the last active Super Admin, by demotion or deactivation.
    if (existing.role === "SUPER_ADMIN") {
      const losingSuperAdmin =
        (data.role && data.role !== "SUPER_ADMIN") || data.isActive === false;
      if (losingSuperAdmin && (await otherActiveSuperAdmins(id)) === 0) {
        return forbidden(
          "This is the last active Super Admin. Promote someone else first."
        );
      }
    }

    if (data.permissionGrants) {
      const illegal = data.permissionGrants.find(
        (permission) =>
          isPermission(permission) && !actor.permissions.has(permission)
      );
      if (illegal) {
        return forbidden(
          `You cannot grant a permission you do not hold: ${illegal}`
        );
      }
    }

    // --- Apply --------------------------------------------------------------

    const update: Prisma.AdminUpdateInput = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.email !== undefined) update.email = data.email;
    if (data.role !== undefined) update.role = data.role;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.phone !== undefined) update.phone = data.phone || null;
    if (data.jobTitle !== undefined) update.jobTitle = data.jobTitle || null;
    if (data.avatarUrl !== undefined) update.avatarUrl = data.avatarUrl ?? null;
    if (data.mustChangePassword !== undefined) {
      update.mustChangePassword = data.mustChangePassword;
    }
    if (data.permissionGrants !== undefined) {
      update.permissionGrants = data.permissionGrants.filter(isPermission);
    }
    if (data.permissionRevokes !== undefined) {
      update.permissionRevokes = data.permissionRevokes.filter(isPermission);
    }

    const employee = await prisma.admin.update({
      where: { id },
      data: update,
      select: EMPLOYEE_SELECT,
    });

    revalidateEmployees();

    // Three distinct verbs so the activity log reads like a sentence rather
    // than a diff.
    if (data.role && data.role !== existing.role) {
      await logActivity({
        actor,
        action: "employee.role_change",
        entity: "Admin",
        entityId: id,
        summary: `${employee.name}: ${ROLE_LABELS[existing.role as Role]} → ${ROLE_LABELS[data.role]}`,
        metadata: { from: existing.role, to: data.role },
        request,
      });
    }
    if (data.isActive !== undefined && data.isActive !== existing.isActive) {
      await logActivity({
        actor,
        action: data.isActive ? "employee.activate" : "employee.deactivate",
        entity: "Admin",
        entityId: id,
        summary: `${data.isActive ? "Reactivated" : "Deactivated"} ${employee.name}`,
        request,
      });
    }
    await logActivity({
      actor,
      action: "employee.update",
      entity: "Admin",
      entityId: id,
      summary: `Updated ${employee.name}`,
      metadata: { fields: Object.keys(update) },
      request,
    });

    return NextResponse.json(employee);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("employees:delete");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  const actor = guard.user;
  const { id } = await params;

  try {
    const existing = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    if (existing.id === actor.id) {
      return forbidden("You cannot delete your own account.");
    }
    if (existing.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
      return forbidden("Only a Super Admin can delete a Super Admin account.");
    }
    if (
      existing.role === "SUPER_ADMIN" &&
      (await otherActiveSuperAdmins(id)) === 0
    ) {
      return forbidden(
        "This is the last active Super Admin and cannot be deleted."
      );
    }

    await prisma.admin.delete({ where: { id } });
    revalidateEmployees();

    // Logged AFTER deletion and with denormalised actor details on the row, so
    // the entry survives the employee it describes.
    await logActivity({
      actor,
      action: "employee.delete",
      entity: "Admin",
      entityId: id,
      summary: `Deleted ${existing.name} (${existing.email})`,
      metadata: { role: existing.role },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
