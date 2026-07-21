import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAnyPermission } from "@/lib/auth";
import { uploadFile } from "@/lib/cloudinary";
import { handleApiError, unauthorized, forbidden } from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";

/**
 * Uploads accept images AND PDFs.
 *
 * The original route hard-rejected anything that was not `image/*`, which made
 * the brochure download on every venture page unreachable — there was no way to
 * get a PDF into the system. PDFs go to Cloudinary as `resource_type: "raw"`;
 * `Media.kind` records which, so the delete path can pass the right type back.
 */

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25MB — brochures are heavy.

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export async function POST(request: NextRequest) {
  /**
   * `media:create` OR `layouts:edit`.
   *
   * A Layout Designer has no media-library access by policy, but still has to
   * put a master-layout image into the system. Accepting either permission is
   * what lets the layout module work without handing that role the whole media
   * library — see the LAYOUT_DESIGNER note in `@/lib/permissions`.
   */
  const guard = await requireAnyPermission(["media:create", "layouts:edit"]);
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();
  const actor = guard.user;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart form upload." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const projectId = formData.get("projectId");
  const plotId = formData.get("plotId");
  const alt = formData.get("alt");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf";
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);

  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, AVIF, GIF, or PDF files are allowed." },
      { status: 400 }
    );
  }

  const maxBytes = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error: `File is too large (max ${Math.round(maxBytes / 1024 / 1024)}MB).`,
      },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadFile(buffer, {
      folder: isPdf ? "own-a-plot/brochures" : "own-a-plot/images",
      resourceType: isPdf ? "raw" : "image",
      fileName: file.name,
    });

    const media = await prisma.media.create({
      data: {
        url: uploaded.url,
        publicId: uploaded.publicId,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
        format: uploaded.format,
        kind: isPdf ? "RAW" : "IMAGE",
        fileName: file.name,
        alt: typeof alt === "string" && alt.trim() ? alt.trim() : undefined,
        projectId:
          typeof projectId === "string" && projectId ? projectId : undefined,
        plotId: typeof plotId === "string" && plotId ? plotId : undefined,
      },
    });

    await logActivity({
      actor,
      action: "media.upload",
      entity: "Media",
      entityId: media.id,
      summary: `Uploaded ${file.name}`,
      metadata: { bytes: file.size, kind: media.kind },
      request,
    });

    return NextResponse.json(media, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
