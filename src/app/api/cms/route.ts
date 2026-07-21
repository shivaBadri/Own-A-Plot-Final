import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { cmsSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  readJson,
} from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import { revalidateCms } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");

  try {
    if (key) {
      const section = await prisma.cmsSection.findUnique({ where: { key } });
      return NextResponse.json(section);
    }
    const sections = await prisma.cmsSection.findMany();
    return NextResponse.json(sections);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requirePermission("cms:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const body = await readJson(request);
  const parsed = cmsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { key, content } = parsed.data;

  try {
    /**
     * `content` is `Record<string, unknown>` from Zod, which Prisma's
     * `InputJsonValue` will not accept — this exact line is the type error that
     * made `npm run build` fail in the delivered project. The cast is the
     * correct fix: the value is already proven to be a JSON object by Zod, and
     * Prisma's input type simply cannot express "any JSON object" without it.
     */
    const section = await prisma.cmsSection.upsert({
      where: { key },
      update: { content: content as Prisma.InputJsonValue },
      create: { key, content: content as Prisma.InputJsonValue },
    });
    revalidateCms();

    await logActivity({
      actor,
      action: "cms.update",
      entity: "CmsSection",
      entityId: section.key,
      summary: `Updated the "${section.key}" content section`,
      request,
    });

    return NextResponse.json(section);
  } catch (error) {
    return handleApiError(error);
  }
}
