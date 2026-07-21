import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** Minimal shape of Prisma's PrismaClientKnownRequestError, without importing
 * the class itself (keeps this file dependency-light and easy to unit test). */
interface PrismaKnownError {
  code: string;
  meta?: { target?: string[]; field_name?: string; cause?: string };
}

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    (error as { code: string }).code.startsWith("P")
  );
}

/**
 * Converts a caught error from a route handler into a clean NextResponse.
 * Use as: `catch (error) { return handleApiError(error); }`
 */
export function handleApiError(error: unknown): NextResponse {
  if (isPrismaKnownError(error)) {
    switch (error.code) {
      case "P2002": {
        const field = error.meta?.target?.join(", ") ?? "field";
        return NextResponse.json(
          { error: `A record with that ${field} already exists.` },
          { status: 409 }
        );
      }
      case "P2025":
        return NextResponse.json({ error: "Record not found." }, { status: 404 });
      case "P2003":
        return NextResponse.json(
          { error: "Invalid reference — the related record doesn't exist." },
          { status: 400 }
        );
      case "P1001":
      case "P1002":
        // Database unreachable. Distinguish it from a code bug so that a Neon
        // cold start or a bad DATABASE_URL is diagnosable from the response.
        console.error("Database unreachable:", error);
        return NextResponse.json(
          { error: "The database is temporarily unreachable. Please retry." },
          { status: 503 }
        );
      default:
        break;
    }
  }

  if (error instanceof Error && error.message.startsWith("Cloudinary is not configured")) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.error(error);
  return NextResponse.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

/** 401 helper — every admin route starts with this. */
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * 403 helper.
 *
 * Kept distinct from `unauthorized()` on purpose. Returning 401 to a signed-in
 * employee who simply lacks a permission makes the client think the session
 * expired, and it will bounce them to the login page they just came from.
 */
export function forbidden(
  message = "You do not have permission to do that."
) {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Flattens a Zod error into `{ error, fields }`. `error` is a human sentence the
 * client can show directly; `fields` lets a form highlight the offending input.
 */
export function validationError(error: ZodError): NextResponse {
  const flattened = error.flatten();
  const firstFieldError = Object.values(flattened.fieldErrors)
    .flat()
    .find(Boolean);

  return NextResponse.json(
    {
      error:
        firstFieldError ??
        flattened.formErrors[0] ??
        "Some fields need attention.",
      fields: flattened.fieldErrors,
    },
    { status: 400 }
  );
}

export interface Paginated<T> {
  items: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  perPage: number
): Paginated<T> {
  return {
    items,
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Safely parses a JSON request body. A malformed body is a 400, not a 500. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
