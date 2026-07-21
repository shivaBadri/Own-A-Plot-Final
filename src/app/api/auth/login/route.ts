import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyPassword,
  issueSession,
  setSessionCookie,
  hashPassword,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { handleApiError, validationError, readJson } from "@/lib/api-utils";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { landingPathFor, type Role } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * A dummy hash to compare against when the email does not exist.
 *
 * Without it, a missing account returns in ~1ms while a wrong password takes
 * ~150ms of bcrypt work — a timing oracle that lets an attacker enumerate valid
 * admin emails. Hashing a throwaway value equalises the two paths.
 */
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash() {
  dummyHashPromise ??= hashPassword("timing-equalisation-placeholder");
  return dummyHashPromise;
}

export async function POST(request: NextRequest) {
  // 10 attempts per 5 minutes per IP. Brute-forcing a bcrypt(12) hash through
  // this is not viable.
  const ip = clientIp(request.headers);
  const limit = rateLimit(`login:${ip}`, 10, 300_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  const body = await readJson(request);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { email, password } = parsed.data;

  try {
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    });

    const hash = admin?.passwordHash ?? (await getDummyHash());
    const valid = await verifyPassword(password, hash);

    if (!admin || !valid) {
      await logActivity({
        actor: null,
        action: "auth.login_failed",
        entity: "Admin",
        entityId: admin?.id ?? null,
        summary: `Failed sign-in attempt for ${email.toLowerCase()}`,
        request,
      });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    /**
     * Deactivation is checked AFTER the password, on purpose. Reporting
     * "this account is disabled" to someone who did not supply the right
     * password would confirm that the email is a real employee.
     */
    if (!admin.isActive) {
      await logActivity({
        actor: null,
        action: "auth.login_failed",
        entity: "Admin",
        entityId: admin.id,
        summary: `Deactivated account attempted sign-in: ${admin.email}`,
        request,
      });
      return NextResponse.json(
        {
          error:
            "This account has been deactivated. Please contact an administrator.",
        },
        { status: 403 }
      );
    }

    const token = await issueSession({
      id: admin.id,
      email: admin.email,
      role: admin.role as Role,
      permissionGrants: admin.permissionGrants,
      permissionRevokes: admin.permissionRevokes,
    });
    await setSessionCookie(token);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    await logActivity({
      actor: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role as Role,
      },
      action: "auth.login",
      entity: "Admin",
      entityId: admin.id,
      summary: `${admin.name} signed in`,
      request,
    });

    return NextResponse.json({
      ok: true,
      // The client redirects here rather than hardcoding /admin/dashboard —
      // a Layout Designer has no dashboard-only landing assumption to break.
      redirectTo: admin.mustChangePassword
        ? "/admin/profile"
        : landingPathFor({
            role: admin.role as Role,
            permissionGrants: admin.permissionGrants,
            permissionRevokes: admin.permissionRevokes,
          }),
      mustChangePassword: admin.mustChangePassword,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
