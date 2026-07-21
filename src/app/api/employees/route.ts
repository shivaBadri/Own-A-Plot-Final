import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission, hashPassword } from "@/lib/auth";
import { employeeCreateSchema, listQuerySchema } from "@/lib/validations";
import {
  handleApiError,
  validationError,
  paginate,
  readJson,
  forbidden,
  unauthorized,
} from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import { revalidateEmployees } from "@/lib/cache";
import { isPermission, ROLE_LABELS, type Role } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Fields safe to return. `passwordHash` is never selected, anywhere. */
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

export async function GET(request: NextRequest) {
  const guard = await requirePermission("employees:view");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);

  const { q, page, perPage } = parsed.data;
  const role = request.nextUrl.searchParams.get("role");
  const status = request.nextUrl.searchParams.get("status");

  const where: Prisma.AdminWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { jobTitle: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role && role in ROLE_LABELS) where.role = role as Role;
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;

  try {
    const [items, total] = await Promise.all([
      prisma.admin.findMany({
        where,
        select: EMPLOYEE_SELECT,
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.admin.count({ where }),
    ]);

    return NextResponse.json(paginate(items, total, page, perPage));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission("employees:create");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  const actor = guard.user;
  const body = await readJson(request);
  const parsed = employeeCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;

  /**
   * Privilege-escalation fence. Without it an Admin could create a
   * SUPER_ADMIN account and then sign into it — a complete bypass of every
   * restriction the role system exists to impose.
   */
  if (data.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Only a Super Admin can create another Super Admin." },
      { status: 403 }
    );
  }

  // The same fence applied to per-employee overrides: you cannot grant a
  // permission you do not hold yourself.
  const illegalGrant = data.permissionGrants.find(
    (permission) =>
      isPermission(permission) && !actor.permissions.has(permission)
  );
  if (illegalGrant) {
    return NextResponse.json(
      { error: `You cannot grant a permission you do not hold: ${illegalGrant}` },
      { status: 403 }
    );
  }

  try {
    const employee = await prisma.admin.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await hashPassword(data.password),
        role: data.role,
        isActive: data.isActive,
        phone: data.phone || null,
        jobTitle: data.jobTitle || null,
        avatarUrl: data.avatarUrl ?? null,
        permissionGrants: data.permissionGrants.filter(isPermission),
        permissionRevokes: data.permissionRevokes.filter(isPermission),
        mustChangePassword: data.mustChangePassword,
        createdById: actor.id,
      },
      select: EMPLOYEE_SELECT,
    });

    revalidateEmployees();

    await logActivity({
      actor,
      action: "employee.create",
      entity: "Admin",
      entityId: employee.id,
      summary: `Created ${employee.name} (${ROLE_LABELS[employee.role as Role]})`,
      metadata: { email: employee.email, role: employee.role },
      request,
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
