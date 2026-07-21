import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { mediaUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  readJson,
} from "@/lib/api-utils";
import { deleteAsset } from "@/lib/cloudinary";
import { logActivity } from "@/lib/activity";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("media:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;
  const body = await readJson(request);
  const parsed = mediaUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const media = await prisma.media.update({
      where: { id },
      data: parsed.data,
    });
    await logActivity({
      actor,
      action: "media.update",
      entity: "Media",
      entityId: id,
      summary: `Updated media ${media.fileName ?? id}`,
      request,
    });

    return NextResponse.json(media);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Deletes from Cloudinary first, then from the database.
 *
 * Order matters. Deleting the row first and then failing the Cloudinary call
 * leaves a paid-for orphan asset with no record of its publicId — unfindable
 * and undeletable. Cloudinary-first means the worst case is a dangling DB row,
 * which is visible in the library and can simply be deleted again.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("media:delete");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;

  try {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await deleteAsset(media.publicId, media.kind === "RAW" ? "raw" : "image");
    await prisma.media.delete({ where: { id } });

    await logActivity({
      actor,
      action: "media.delete",
      entity: "Media",
      entityId: id,
      summary: `Deleted media ${media.fileName ?? id}`,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
