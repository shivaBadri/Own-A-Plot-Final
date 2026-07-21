import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { plotBulkUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  readJson,
} from "@/lib/api-utils";
import { revalidatePlots } from "@/lib/cache";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

/**
 * Applies one patch to a set of plots in a single write — the "Bulk Plot
 * Update" from the admin plots table.
 *
 * Only the fields actually sent are changed; an unchecked field is left alone
 * on every selected row rather than reset to a default. `updateMany` is one
 * round-trip regardless of selection size.
 */
export async function PATCH(request: NextRequest) {
  const guard = await requirePermission("plots:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const body = await readJson(request);
  const parsed = plotBulkUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { ids, status, priceOnRequest } = parsed.data;

  const data: Prisma.PlotUpdateManyMutationInput = {};
  if (status !== undefined) data.status = status;
  if (priceOnRequest !== undefined) data.priceOnRequest = priceOnRequest;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Choose at least one change to apply." },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.plot.updateMany({
      where: { id: { in: ids } },
      data,
    });
    revalidatePlots();

    const changes = [
      status ? `status → ${status}` : null,
      priceOnRequest !== undefined
        ? `price ${priceOnRequest ? "hidden" : "shown"}`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    await logActivity({
      actor,
      action: "plot.bulkUpdate",
      entity: "Plot",
      summary: `Bulk updated ${result.count} plot${
        result.count === 1 ? "" : "s"
      }${changes ? ` (${changes})` : ""}`,
      metadata: { count: result.count, ids, changes },
      request,
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    return handleApiError(error);
  }
}
