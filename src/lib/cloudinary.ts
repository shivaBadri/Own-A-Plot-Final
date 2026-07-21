import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/** Fails fast at request time with a clear message instead of a Cloudinary 401. */
export function assertCloudinaryConfigured() {
  const missing = [
    ["CLOUDINARY_CLOUD_NAME", process.env.CLOUDINARY_CLOUD_NAME],
    ["CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY],
    ["CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Cloudinary is not configured. Missing: ${missing.join(", ")}`
    );
  }
}

export interface UploadResult {
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  bytes: number;
  format: string | null;
  resourceType: "image" | "raw";
}

/**
 * Uploads a buffer to Cloudinary.
 *
 * `resourceType: "raw"` is what makes brochures work — PDFs uploaded as
 * `image` get transformed and served with the wrong content type, which is why
 * the original upload route rejected everything that was not an image.
 */
export async function uploadFile(
  fileBuffer: Buffer,
  options: {
    folder?: string;
    resourceType?: "image" | "raw";
    fileName?: string;
  } = {}
): Promise<UploadResult> {
  assertCloudinaryConfigured();

  const {
    folder = "own-a-plot",
    resourceType = "image",
    fileName,
  } = options;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: Boolean(fileName),
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Cloudinary returned no result"));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width ?? null,
          height: result.height ?? null,
          bytes: result.bytes ?? fileBuffer.byteLength,
          format: result.format ?? null,
          resourceType,
        });
      }
    );
    stream.end(fileBuffer);
  });
}

/** Back-compat alias — the original route imported `uploadImage`. */
export async function uploadImage(fileBuffer: Buffer, folder = "own-a-plot") {
  return uploadFile(fileBuffer, { folder, resourceType: "image" });
}

/**
 * Deleting needs the same resource_type the asset was uploaded with, which is
 * exactly why Media.kind exists.
 */
export async function deleteAsset(
  publicId: string,
  resourceType: "image" | "raw" = "image"
) {
  assertCloudinaryConfigured();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}

export async function deleteImage(publicId: string) {
  return deleteAsset(publicId, "image");
}

export default cloudinary;
