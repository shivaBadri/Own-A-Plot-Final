import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requirePermission } from "@/lib/auth";
import { layoutUpdateSchema } from "@/lib/validations";
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

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();

  try {
    const layout = await prisma.layout.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, slug: true, isPublished: true } },
        shapes: {
          orderBy: { createdAt: "asc" },
          include: {
            plot: {
              select: {
                id: true,
                plotNumber: true,
                sizeSqft: true,
                dimensions: true,
                facing: true,
                price: true,
                priceOnRequest: true,
                status: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (
      !layout ||
      (!user && (!layout.isPublished || !layout.project.isPublished))
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(layout);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("layouts:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;
  const body = await readJson(request);
  const parsed = layoutUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;
  const publishToggled = data.isPublished !== undefined;

  if (publishToggled && !actor.permissions.has("layouts:publish")) {
    return forbidden("You do not have permission to publish a layout.");
  }

  try {
    const layout = await prisma.layout.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description || null }
          : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.imageWidth !== undefined
          ? { imageWidth: data.imageWidth }
          : {}),
        ...(data.imageHeight !== undefined
          ? { imageHeight: data.imageHeight }
          : {}),
        ...(data.isPublished !== undefined
          ? { isPublished: data.isPublished }
          : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });

    revalidateLayouts();

    await logActivity({
      actor,
      action: publishToggled
        ? data.isPublished
          ? "layout.publish"
          : "layout.unpublish"
        : "layout.update",
      entity: "Layout",
      entityId: id,
      summary: publishToggled
        ? `${data.isPublished ? "Published" : "Unpublished"} layout "${layout.name}"`
        : `Updated layout "${layout.name}"`,
      request,
    });

    return NextResponse.json(layout);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("layouts:delete");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;

  try {
    const layout = await prisma.layout.findUnique({
      where: { id },
      select: { name: true },
    });

    // Shapes cascade at the schema level. The layout IMAGE is deliberately left
    // in Cloudinary and in the media library: it is usually the architect's
    // master plan, reused across phases, and destroying it because one plan
    // record was removed is not recoverable.
    await prisma.layout.delete({ where: { id } });
    revalidateLayouts();

    await logActivity({
      actor,
      action: "layout.delete",
      entity: "Layout",
      entityId: id,
      summary: `Deleted layout "${layout?.name ?? id}"`,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
