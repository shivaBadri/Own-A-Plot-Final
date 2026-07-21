import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session";
import {
  hasPermission,
  resolvePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
import { sessionCookieDomain } from "@/lib/admin-url";

// Node-only helpers (bcryptjs, next/headers, Prisma). Never import this file
// from middleware.ts or any Edge Runtime code — use "@/lib/session" and
// "@/lib/permissions" there instead.

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  // In subdomain mode the cookie is scoped to the registrable parent so it is
  // valid on both ownaplot.com and admin.ownaplot.com. In path mode this is
  // undefined and the cookie stays host-only, which is stricter and correct.
  const domain = sessionCookieDomain();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    ...(domain ? { domain } : {}),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const domain = sessionCookieDomain();
  // The domain must match the one used to SET the cookie, or the browser
  // deletes a different cookie and the session survives the sign-out.
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** The signed-in employee, as every guard and page needs them. */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  jobTitle: string | null;
  mustChangePassword: boolean;
  permissionGrants: string[];
  permissionRevokes: string[];
  permissions: Set<Permission>;
}

/**
 * Loads the signed-in employee FROM THE DATABASE, not from the token.
 *
 * This is the authoritative check and the reason a deactivated employee or a
 * demoted role takes effect on the very next request instead of when their
 * seven-day JWT happens to expire. Wrapped in React `cache()` so a layout, a
 * page and a nested server component share one query per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      jobTitle: true,
      mustChangePassword: true,
      permissionGrants: true,
      permissionRevokes: true,
    },
  });

  // Deleted or deactivated — the token is no longer worth anything.
  if (!admin || !admin.isActive) return null;

  return {
    ...admin,
    role: admin.role as Role,
    permissions: resolvePermissions({
      role: admin.role as Role,
      permissionGrants: admin.permissionGrants,
      permissionRevokes: admin.permissionRevokes,
    }),
  };
});

export function userCan(
  user: Pick<CurrentUser, "role" | "permissionGrants" | "permissionRevokes">,
  permission: Permission
): boolean {
  return hasPermission(user, permission);
}

/** Guard for API routes: the authenticated employee, or null. */
export async function requireAdmin(): Promise<CurrentUser | null> {
  return getCurrentUser();
}

export type PermissionGuardResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; status: 401 | 403; user: CurrentUser | null };

/**
 * The single guard every admin API route starts with.
 *
 * Returns a discriminated result rather than throwing, so a route handler can
 * decide between 401 and 403 without a try/catch — and so the two are never
 * conflated. 401 means "prove who you are"; 403 means "we know who you are and
 * the answer is still no".
 */
export async function requirePermission(
  permission: Permission
): Promise<PermissionGuardResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, user: null };
  if (!userCan(user, permission)) return { ok: false, status: 403, user };
  return { ok: true, user };
}

/** Same, but satisfied by any one of several permissions. */
export async function requireAnyPermission(
  permissions: readonly Permission[]
): Promise<PermissionGuardResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, user: null };
  const granted = permissions.some((permission) => userCan(user, permission));
  if (!granted) return { ok: false, status: 403, user };
  return { ok: true, user };
}

/**
 * Issues a session token for an employee. Kept here so that the token's claims
 * and the database row cannot drift — every caller goes through this.
 */
export async function issueSession(admin: {
  id: string;
  email: string;
  role: Role;
  permissionGrants: string[];
  permissionRevokes: string[];
}) {
  return createSessionToken({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
    grants: admin.permissionGrants,
    revokes: admin.permissionRevokes,
  });
}

// Re-exported so existing `import { createSessionToken, ... } from "@/lib/auth"`
// call sites in route handlers keep working unchanged.
export { SESSION_COOKIE, createSessionToken, verifySessionToken };
export type { SessionPayload };
