/**
 * Admin URL resolution.
 *
 * The admin has to work in two shapes without a code change:
 *
 *   1. Path mode      https://ownaplot.com/admin/login
 *   2. Subdomain mode https://admin.ownaplot.com/login
 *
 * `NEXT_PUBLIC_ADMIN_URL` is the only switch. Leave it unset or point it at the
 * public origin and you get path mode; point it at a different hostname and
 * middleware rewrites that host's root onto `/admin/*` and everything moves.
 *
 * Nothing anywhere else in the codebase should build an admin URL by
 * concatenating "/admin" onto something. Every link goes through here, which
 * is what makes the switch a one-variable change rather than a search and
 * replace across forty files.
 *
 * Edge-safe: no Node built-ins, no Prisma. Middleware imports it.
 */

/** Configured admin origin, or null in path mode. */
export function adminOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_ADMIN_URL?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();

    // Same host as the public site means the operator wrote
    // NEXT_PUBLIC_ADMIN_URL=https://ownaplot.com/admin. That is path mode
    // expressed the long way round, not a dedicated origin.
    if (site) {
      try {
        if (new URL(site).hostname.toLowerCase() === url.hostname.toLowerCase()) {
          return null;
        }
      } catch {
        // A malformed NEXT_PUBLIC_SITE_URL must not take the admin link down.
      }
    }

    return url.origin;
  } catch {
    return null;
  }
}

/** True when the admin lives on its own hostname. */
export function isSubdomainMode(): boolean {
  return adminOrigin() !== null;
}

/**
 * An absolute or relative URL for an admin path.
 *
 * Pass the path as it exists in the app router — `/admin/dashboard` — and this
 * strips the `/admin` prefix in subdomain mode, because there the admin IS the
 * root. Callers never have to know which mode they are in.
 */
export function adminUrl(path = "/admin/dashboard"): string {
  const normalised = path.startsWith("/") ? path : `/${path}`;
  const origin = adminOrigin();

  if (!origin) return normalised;

  const withoutPrefix =
    normalised === "/admin"
      ? "/"
      : normalised.startsWith("/admin/")
        ? normalised.slice("/admin".length)
        : normalised;

  return `${origin}${withoutPrefix === "" ? "/" : withoutPrefix}`;
}

/** Where the public site's "Admin" button points. */
export function adminLoginUrl(): string {
  return adminUrl("/admin/login");
}

/**
 * Cookie domain for the session.
 *
 * In subdomain mode the cookie has to be readable on both `ownaplot.com` and
 * `admin.ownaplot.com` — otherwise signing in on the admin host leaves the
 * public site unaware, and any future shared surface breaks. Setting it to the
 * registrable parent (`.ownaplot.com`) covers both.
 *
 * Returns undefined in path mode and on localhost. Browsers reject a Domain
 * attribute on `localhost`, and a host-only cookie is the safer default
 * whenever it will do.
 */
export function sessionCookieDomain(): string | undefined {
  const explicit = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (explicit) return explicit;

  const origin = adminOrigin();
  if (!origin) return undefined;

  try {
    const adminHost = new URL(origin).hostname.toLowerCase();
    const siteRaw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!siteRaw) return undefined;

    const siteHost = new URL(siteRaw).hostname.toLowerCase();
    if (siteHost === "localhost" || adminHost === "localhost") return undefined;
    // Bare IPs cannot carry a Domain attribute either.
    if (/^\d+\.\d+\.\d+\.\d+$/.test(siteHost)) return undefined;

    // Only widen when the admin really is a subdomain of the public site.
    // If they are unrelated origins, a shared cookie is impossible anyway and
    // guessing a parent would be wrong.
    if (adminHost === siteHost || adminHost.endsWith(`.${siteHost}`)) {
      return `.${siteHost}`;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
