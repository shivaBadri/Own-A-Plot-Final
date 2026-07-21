import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { enquirySchema, listQuerySchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  paginate,
  readJson,
} from "@/lib/api-utils";
import { revalidateEnquiries } from "@/lib/cache";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public — anyone can submit an enquiry.
 *
 * This is the only unauthenticated write on the site, so it carries three
 * defences: a per-IP rate limit, a honeypot field, and FK validation against
 * the referenced project/plot (a stale ID gets nulled rather than 500ing).
 */
export async function POST(request: NextRequest) {
  const limit = rateLimit(`enquiry:${clientIp(request.headers)}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many enquiries. Please wait a moment and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  const body = await readJson(request);
  const parsed = enquirySchema.safeParse(body);

  if (!parsed.success) {
    // A filled honeypot is a bot, not a user with a typo. Return 200 so the bot
    // believes it succeeded and does not retry, but write nothing.
    const flat = parsed.error.flatten();
    if (flat.fieldErrors.company) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }
    return validationError(parsed.error);
  }

  const { company: _honeypot, projectId, plotId, ...data } = parsed.data;
  void _honeypot;

  try {
    // A page can be open in a tab while an admin deletes the venture behind it.
    // Verify the FKs instead of letting Prisma throw P2003 on a stale ID.
    const [projectExists, plotExists] = await Promise.all([
      projectId
        ? prisma.project.count({ where: { id: projectId } })
        : Promise.resolve(0),
      plotId ? prisma.plot.count({ where: { id: plotId } }) : Promise.resolve(0),
    ]);

    const enquiry = await prisma.enquiry.create({
      data: {
        ...data,
        projectId: projectExists > 0 ? projectId : null,
        plotId: plotExists > 0 ? plotId : null,
      },
    });

    revalidateEnquiries();
    return NextResponse.json({ ok: true, id: enquiry.id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Admin only — list enquiries with search, status filter, and pagination. */
export async function GET(request: NextRequest) {
  const guard = await requirePermission("enquiries:view");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) return validationError(parsed.error);

  const { q, page, perPage } = parsed.data;
  const status = request.nextUrl.searchParams.get("status");

  const where: Prisma.EnquiryWhereInput = {};
  if (status === "NEW" || status === "CONTACTED" || status === "CLOSED") {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { interest: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.enquiry.findMany({
        where,
        include: { project: true, plot: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.enquiry.count({ where }),
    ]);

    return NextResponse.json(paginate(items, total, page, perPage));
  } catch (error) {
    return handleApiError(error);
  }
}
