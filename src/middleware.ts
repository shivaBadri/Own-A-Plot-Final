import { NextRequest, NextResponse } from "next/server";
import {
  verifySessionToken,
  sessionSubject,
  SESSION_COOKIE,
} from "@/lib/session";
import {
  hasPermission,
  isOpenAdminRoute,
  permissionForPath,
  landingPathFor,
} from "@/lib/permissions";

/**
 * Edge gate for the admin.
 *
 * It answers two questions before a request reaches Node:
 *   1. Is there a valid session? If not, bounce to login carrying `from`.
 *   2. Does the role in that session permit this path? If not, bounce to a
 *      403 page rather than rendering a shell the employee will be denied.
 *
 * It deliberately does NOT talk to Postgres — it cannot, on the Edge. The
 * claims in the JWT are a cache of the employee's role, so a demotion made 30
 * seconds ago may still pass this fence. That is fine and intended: the admin
 * layout and every API route re-read the row from the database and enforce the
 * real answer. Middleware exists to make the common case fast, not to be the
 * only lock on the door.
 *
 * Two deployment modes are supported (Stage 4): the admin can live at
 * `/admin/*` on the main domain, or at the root of a dedicated admin hostname.
 * `ADMIN_HOSTNAMES` rewrites the latter onto the former so exactly one set of
 * routes, guards and cookies serves both.
 */

const ADMIN_HOSTNAMES = (process.env.ADMIN_HOSTNAMES ?? "")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAdminHost(request: NextRequest): boolean {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!host) return false;
  if (ADMIN_HOSTNAMES.includes(host)) return true;

  const adminHost = hostOf(process.env.NEXT_PUBLIC_ADMIN_URL);
  if (!adminHost) return false;

  // Subdomain mode only counts when the admin URL points at a DIFFERENT
  // hostname from the public site. When both are example.com — the
  // `example.com/admin/login` deployment — there is nothing to rewrite.
  const siteHost = hostOf(process.env.NEXT_PUBLIC_SITE_URL);
  if (siteHost && adminHost === siteHost) return false;

  return adminHost === host;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Dedicated admin hostname -------------------------------------------
  // admin.example.com/dashboard  ->  /admin/dashboard, internally.
  if (isAdminHost(request) && !pathname.startsWith("/admin")) {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname =
      pathname === "/" ? "/admin/dashboard" : `/admin${pathname}`;
    return NextResponse.rewrite(rewritten);
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // --- Login page ----------------------------------------------------------
  if (pathname === "/admin/login") {
    if (session) {
      // Already signed in. Send them to the first page their role can open,
      // which is not necessarily the dashboard.
      const target = landingPathFor(sessionSubject(session));
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- Permission gate -----------------------------------------------------
  if (isOpenAdminRoute(pathname)) {
    return NextResponse.next();
  }

  const required = permissionForPath(pathname);
  if (required && !hasPermission(sessionSubject(session), required)) {
    const denied = new URL("/admin/no-access", request.url);
    denied.searchParams.set("from", pathname);
    return NextResponse.redirect(denied);
  }

  return NextResponse.next();
}

export const config = {
  // The negative lookahead lets the dedicated-hostname rewrite see ordinary
  // page requests while keeping Next's own assets, the API and files with an
  // extension out of the middleware entirely.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.[\\w]+$).*)"],
};
