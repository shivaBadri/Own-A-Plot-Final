import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, requirePermission } from "@/lib/auth";
import { plotUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  readJson,
} from "@/lib/api-utils";
import { revalidatePlots } from "@/lib/cache";
import { logActivity } from "@/lib/activity";
import { deleteAsset } from "@/lib/cloudinary";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();

  try {
    const plot = await prisma.plot.findUnique({
      where: { id },
      include: { project: true, media: true },
    });

    if (!plot || (!plot.project.isPublished && !user)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(plot);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("plots:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;
  const body = await readJson(request);
  const parsed = plotUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const plot = await prisma.plot.update({ where: { id }, data: parsed.data });
    revalidatePlots();

    await logActivity({
      actor,
      action: "plot.update",
      entity: "Plot",
      entityId: id,
      summary: `Updated plot ${plot.plotNumber}`,
      metadata: { fields: Object.keys(parsed.data) },
      request,
    });

    return NextResponse.json(plot);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("plots:delete");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;

  try {
    const plot = await prisma.plot.findUnique({
      where: { id },
      select: { plotNumber: true },
    });

    const media = await prisma.media.findMany({
      where: { plotId: id },
      select: { publicId: true, kind: true },
    });

    await Promise.allSettled(
      media.map((item) =>
        deleteAsset(item.publicId, item.kind === "RAW" ? "raw" : "image")
      )
    );

    await prisma.$transaction([
      prisma.media.deleteMany({ where: { plotId: id } }),
      prisma.plot.delete({ where: { id } }),
    ]);
    revalidatePlots();

    await logActivity({
      actor,
      action: "plot.delete",
      entity: "Plot",
      entityId: id,
      summary: `Deleted plot ${plot?.plotNumber ?? id}`,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
