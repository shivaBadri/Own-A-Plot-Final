import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { activityQuerySchema } from "@/lib/validations";
import {
  handleApiError,
  validationError,
  paginate,
  forbidden,
  unauthorized,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * Read-only by design. There is no POST, PATCH or DELETE on this route and
 * there should never be one — an audit trail an administrator can edit is not
 * an audit trail.
 */
export async function GET(request: NextRequest) {
  const guard = await requirePermission("employees:view");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  const parsed = activityQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);

  const { q, actorId, action, entity, page, perPage } = parsed.data;

  const where: Prisma.ActivityLogWhereInput = {};
  if (actorId) where.actorId = actorId;
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (q) {
    where.OR = [
      { summary: { contains: q, mode: "insensitive" } },
      { actorName: { contains: q, mode: "insensitive" } },
      { actorEmail: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json(paginate(items, total, page, perPage));
  } catch (error) {
    return handleApiError(error);
  }
}
