import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { layoutShapesSchema } from "@/lib/validations";
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

/**
 * Replaces the entire shape set for a layout, in one transaction.
 *
 * PUT rather than a per-shape REST surface because the editor's unit of work is
 * the whole drawing: a designer traces six plots, deletes two, re-binds a
 * third and hits Save. Sending that as eleven separate requests means eleven
 * chances to half-apply the change and leave the plan in a state nobody drew.
 * One atomic replace is either fully applied or not applied at all.
 *
 * Shapes carrying an `id` that still exists are UPDATED rather than recreated,
 * so their row identity — and anything that later references it — survives an
 * ordinary save.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("layouts:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;
  const body = await readJson(request);
  const parsed = layoutShapesSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const incoming = parsed.data.shapes;

  // A plot may be drawn only once per layout. Catching it here produces a
  // readable message; letting Postgres raise the composite-unique violation
  // produces "P2002 on layoutId, plotId", which no designer can act on.
  const seen = new Set<string>();
  for (const shape of incoming) {
    if (!shape.plotId) continue;
    if (seen.has(shape.plotId)) {
      return NextResponse.json(
        {
          error:
            "The same plot is mapped to two boundaries. Each plot can appear once per plan.",
        },
        { status: 409 }
      );
    }
    seen.add(shape.plotId);
  }

  try {
    const layout = await prisma.layout.findUnique({
      where: { id },
      select: { id: true, name: true, projectId: true },
    });
    if (!layout) {
      return NextResponse.json({ error: "Layout not found." }, { status: 404 });
    }

    // Every bound plot must belong to THIS layout's venture. Without the
    // check, a crafted request could attach plot numbers from another project
    // and the public plan would show a neighbouring venture's inventory.
    const plotIds = incoming
      .map((shape) => shape.plotId)
      .filter((value): value is string => Boolean(value));

    if (plotIds.length > 0) {
      const validCount = await prisma.plot.count({
        where: { id: { in: plotIds }, projectId: layout.projectId },
      });
      if (validCount !== plotIds.length) {
        return NextResponse.json(
          { error: "One or more plots do not belong to this venture." },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.layoutShape.findMany({
      where: { layoutId: id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((shape) => shape.id));
    const keptIds = new Set(
      incoming
        .map((shape) => shape.id)
        .filter((value): value is string => Boolean(value) && existingIds.has(value!))
    );
    const removedIds = [...existingIds].filter((value) => !keptIds.has(value));

    await prisma.$transaction([
      prisma.layoutShape.deleteMany({ where: { id: { in: removedIds } } }),
      ...incoming.map((shape) => {
        const data = {
          layoutId: id,
          plotId: shape.plotId ?? null,
          kind: shape.kind,
          label: shape.label || null,
          points: shape.points,
        };
        return shape.id && existingIds.has(shape.id)
          ? prisma.layoutShape.update({ where: { id: shape.id }, data })
          : prisma.layoutShape.create({ data });
      }),
    ]);

    revalidateLayouts();

    await logActivity({
      actor,
      action: "layout.polygon_save",
      entity: "Layout",
      entityId: id,
      summary: `Saved ${incoming.length} boundar${incoming.length === 1 ? "y" : "ies"} on "${layout.name}"`,
      metadata: { total: incoming.length, removed: removedIds.length },
      request,
    });

    const shapes = await prisma.layoutShape.findMany({
      where: { layoutId: id },
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
    });

    return NextResponse.json({ ok: true, shapes });
  } catch (error) {
    return handleApiError(error);
  }
}
