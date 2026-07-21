import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { enquiryUpdateSchema } from "@/lib/validations";
import {
  handleApiError,
  unauthorized,
  forbidden,
  validationError,
  readJson,
} from "@/lib/api-utils";
import { revalidateEnquiries } from "@/lib/cache";
import { logActivity } from "@/lib/activity";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("enquiries:edit");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;
  const body = await readJson(request);
  const parsed = enquiryUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const enquiry = await prisma.enquiry.update({
      where: { id },
      data: parsed.data,
    });
    revalidateEnquiries();

    await logActivity({
      actor,
      action: "enquiry.update",
      entity: "Enquiry",
      entityId: id,
      summary: `Updated enquiry from ${enquiry.name}`,
      metadata: { status: enquiry.status },
      request,
    });

    return NextResponse.json(enquiry);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requirePermission("enquiries:delete");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  const { id } = await params;
  try {
    await prisma.enquiry.delete({ where: { id } });
    revalidateEnquiries();

    await logActivity({
      actor,
      action: "enquiry.delete",
      entity: "Enquiry",
      entityId: id,
      summary: `Deleted enquiry ${id}`,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
