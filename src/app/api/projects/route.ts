import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser, requirePermission } from "@/lib/auth";
import { projectSchema, listQuerySchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  paginate,
  readJson,
} from "@/lib/api-utils";
import { revalidateProjects } from "@/lib/cache";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

/**
 * Public callers only ever see published projects. Admins (verified via session)
 * see everything, including drafts, since the admin UI relies on the full set.
 */
export async function GET(request: NextRequest) {
  // Anonymous callers only ever see published ventures.
  const user = await getCurrentUser();

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);

  const { q, page, perPage } = parsed.data;
  const status = request.nextUrl.searchParams.get("status");
  const published = request.nextUrl.searchParams.get("published");

  const where: Prisma.ProjectWhereInput = user ? {} : { isPublished: true };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { tagline: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status === "UPCOMING" || status === "ONGOING" || status === "COMPLETED") {
    where.status = status;
  }
  // Only an admin may narrow by draft/published; a public caller is pinned to
  // published above and cannot widen it with a query param.
  if (user && (published === "true" || published === "false")) {
    where.isPublished = published === "true";
  }

  try {
    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * perPage,
        take: perPage,
        include: user
          ? { _count: { select: { plots: true, enquiries: true, media: true } } }
          : undefined,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json(paginate(items, total, page, perPage));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission("ventures:create");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const body = await readJson(request);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const project = await prisma.project.create({ data: parsed.data });
    revalidateProjects();

    await logActivity({
      actor,
      action: "venture.create",
      entity: "Project",
      entityId: project.id,
      summary: `Created venture ${project.name}`,
      request,
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
