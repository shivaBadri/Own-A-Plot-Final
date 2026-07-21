import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { siteSettingsSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  readJson,
} from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import { revalidateSettings } from "@/lib/cache";
import { resolveFeatures } from "@/lib/features";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("settings:view");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
    });
    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requirePermission("settings:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const body = await readJson(request);
  const parsed = siteSettingsSchema.partial().safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { socialLinks, features, ...rest } = parsed.data;

  // Feature flags are re-resolved through the registry before storage: unknown
  // keys are dropped and missing keys take their default, so a malformed or
  // stale payload can never persist a flag the app does not understand.
  const sanitisedFeatures =
    features !== undefined ? resolveFeatures(features) : undefined;

  const data: Prisma.SiteSettingsUncheckedUpdateInput = { ...rest };
  if (socialLinks !== undefined) {
    data.socialLinks = socialLinks as Prisma.InputJsonValue;
  }
  if (sanitisedFeatures !== undefined) {
    data.features = sanitisedFeatures as Prisma.InputJsonValue;
  }

  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: {
        id: "singleton",
        siteName: rest.siteName ?? "Own A Plot",
        ...rest,
        ...(socialLinks
          ? { socialLinks: socialLinks as Prisma.InputJsonValue }
          : {}),
        ...(sanitisedFeatures
          ? { features: sanitisedFeatures as Prisma.InputJsonValue }
          : {}),
      },
    });
    revalidateSettings();

    await logActivity({
      actor,
      action: "settings.update",
      entity: "SiteSettings",
      entityId: "singleton",
      summary: "Updated site settings",
      metadata: { fields: Object.keys(parsed.data) },
      request,
    });

    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
