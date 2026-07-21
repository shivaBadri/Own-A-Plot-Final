import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser, requirePermission } from "@/lib/auth";
import { layoutCreateSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  readJson,
} from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import { revalidateLayouts } from "@/lib/cache";

export const dynamic = "force-dynamic";

/**
 * GET is readable without a session, but only for PUBLISHED layouts on
 * PUBLISHED ventures — the public master-layout viewer uses the same endpoint
 * the admin does, and an unpublished plan must not be reachable by guessing a
 * projectId.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const projectId = request.nextUrl.searchParams.get("projectId");

  const where: Prisma.LayoutWhereInput = user
    ? {}
    : { isPublished: true, project: { isPublished: true } };
  if (projectId) where.projectId = projectId;

  try {
    const layouts = await prisma.layout.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        project: { select: { id: true, name: true, slug: true } },
        _count: { select: { shapes: true } },
      },
    });
    return NextResponse.json(layouts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission("layouts:create");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const body = await readJson(request);
  const parsed = layoutCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;

  // Publishing is its own permission, exactly as it is for ventures.
  if (data.isPublished && !actor.permissions.has("layouts:publish")) {
    return forbidden("You do not have permission to publish a layout.");
  }

  try {
    const layout = await prisma.layout.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        description: data.description || null,
        imageUrl: data.imageUrl,
        imageWidth: data.imageWidth,
        imageHeight: data.imageHeight,
        isPublished: data.isPublished,
        sortOrder: data.sortOrder,
      },
      include: { project: { select: { name: true } } },
    });

    revalidateLayouts();

    await logActivity({
      actor,
      action: "layout.create",
      entity: "Layout",
      entityId: layout.id,
      summary: `Created layout "${layout.name}" for ${layout.project.name}`,
      request,
    });

    return NextResponse.json(layout, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
