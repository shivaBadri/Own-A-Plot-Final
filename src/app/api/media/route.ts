import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { listQuerySchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  paginate,
} from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * The media library had no list endpoint at all — the admin page read Prisma
 * directly and could not paginate, search, or refresh after an upload.
 */
export async function GET(request: NextRequest) {
  const guard = await requirePermission("media:view");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);

  const { q, page, perPage } = parsed.data;
  const kind = request.nextUrl.searchParams.get("kind");

  const where: Prisma.MediaWhereInput = {};
  if (kind === "IMAGE" || kind === "RAW") where.kind = kind;
  if (q) {
    where.OR = [
      { fileName: { contains: q, mode: "insensitive" } },
      { alt: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.media.count({ where }),
    ]);

    return NextResponse.json(paginate(items, total, page, perPage));
  } catch (error) {
    return handleApiError(error);
  }
}
