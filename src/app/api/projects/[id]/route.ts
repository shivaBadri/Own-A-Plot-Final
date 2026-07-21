import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requirePermission } from "@/lib/auth";
import { projectUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  readJson,
} from "@/lib/api-utils";
import { revalidateProjects } from "@/lib/cache";
import { logActivity } from "@/lib/activity";
import { deleteAsset } from "@/lib/cloudinary";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  // Anonymous callers may read a PUBLISHED venture; a draft needs a session.
  const user = await getCurrentUser();

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: { plots: true, media: true },
    });

    if (!project || (!project.isPublished && !user)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("ventures:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;
  const body = await readJson(request);
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  /**
   * Publishing is a permission of its own, separate from editing. Marketing
   * can push a venture live; Sales can fix a typo in it and cannot. Checking
   * only `ventures:edit` here would have collapsed that distinction and made
   * the `publish` action in the matrix decorative.
   */
  const publishToggled = parsed.data.isPublished !== undefined;
  if (publishToggled && !actor.permissions.has("ventures:publish")) {
    return forbidden(
      "You do not have permission to publish or unpublish a venture."
    );
  }

  try {
    const project = await prisma.project.update({
      where: { id },
      data: parsed.data,
    });
    revalidateProjects();

    await logActivity({
      actor,
      action: publishToggled
        ? parsed.data.isPublished
          ? "venture.publish"
          : "venture.unpublish"
        : "venture.update",
      entity: "Project",
      entityId: id,
      summary: publishToggled
        ? `${parsed.data.isPublished ? "Published" : "Unpublished"} ${project.name}`
        : `Updated ${project.name}`,
      request,
    });

    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Deleting a project cascades to its plots (schema-level onDelete: Cascade) and
 * nulls the FK on its enquiries and media (onDelete: SetNull).
 *
 * The Cloudinary assets attached to it are destroyed first, inside the same
 * request. If Cloudinary fails, the DB row is left alone rather than orphaning
 * live images behind a deleted record — the admin can retry.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("ventures:delete");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { name: true },
    });

    const media = await prisma.media.findMany({
      where: { projectId: id },
      select: { publicId: true, kind: true },
    });

    const results = await Promise.allSettled(
      media.map((item) =>
        deleteAsset(item.publicId, item.kind === "RAW" ? "raw" : "image")
      )
    );
    const failed = results.filter((r) => r.status === "rejected").length;

    await prisma.$transaction([
      prisma.media.deleteMany({ where: { projectId: id } }),
      prisma.project.delete({ where: { id } }),
    ]);
    revalidateProjects();

    await logActivity({
      actor,
      action: "venture.delete",
      entity: "Project",
      entityId: id,
      summary: `Deleted venture ${project?.name ?? id}`,
      request,
    });

    return NextResponse.json({
      ok: true,
      ...(failed > 0
        ? {
            warning: `${failed} media file${failed === 1 ? "" : "s"} could not be removed from Cloudinary and may need manual cleanup.`,
          }
        : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
