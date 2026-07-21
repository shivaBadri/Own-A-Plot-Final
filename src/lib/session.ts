import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/permissions";

export const SESSION_COOKIE = "admin_session";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me"
);

/**
 * Claims carried in the admin JWT.
 *
 * `role`, `grants` and `revokes` are embedded so that MIDDLEWARE can make a
 * permission decision on the Edge without a database round trip — that is the
 * difference between a 5ms redirect and a 300ms one on every admin navigation.
 *
 * They are a CACHE, not the source of truth. A role change or a deactivation
 * only reaches an existing token when it is reissued, so the admin layout and
 * every API guard re-read the employee row from Postgres and win any conflict.
 * Middleware is the fast fence; the database is the real one.
 *
 * `role` is optional on read because tokens issued before Stage 2 do not carry
 * it. Those are treated as SUPER_ADMIN, which matches what the account could
 * do at the moment the token was signed.
 */
export interface SessionPayload {
  adminId: string;
  email: string;
  role?: Role;
  grants?: string[];
  revokes?: string[];
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const claims = payload as unknown as SessionPayload;
    if (!claims?.adminId || !claims?.email) return null;
    return claims;
  } catch {
    return null;
  }
}

/** Session claims widened into the shape the permission helpers expect. */
export function sessionSubject(session: SessionPayload) {
  return {
    role: session.role ?? ("SUPER_ADMIN" as Role),
    permissionGrants: session.grants ?? [],
    permissionRevokes: session.revokes ?? [],
  };
}
