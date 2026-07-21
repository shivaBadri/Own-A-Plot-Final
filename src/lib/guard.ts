import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";

/**
 * Page-level guard for admin server components.
 *
 * This is the third and final fence, after Edge middleware and the API route
 * guards. It exists because the first two can be bypassed by a request shape
 * neither anticipated — a direct RSC payload fetch, a rewrite, a future route
 * added without a middleware entry. Any page that renders privileged data
 * calls this first and gets a typed user back, so there is no path where a
 * page renders and the permission check was merely assumed.
 */
export async function requirePageAccess(
  permission: Permission
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!user.permissions.has(permission)) {
    redirect(`/admin/no-access?from=${encodeURIComponent(permission)}`);
  }
  return user;
}

/** Same, satisfied by any one of several permissions. */
export async function requirePageAccessAny(
  permissions: readonly Permission[]
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!permissions.some((permission) => user.permissions.has(permission))) {
    redirect(`/admin/no-access?from=${encodeURIComponent(permissions[0])}`);
  }
  return user;
}

/** For pages every signed-in employee may open (profile, no-access). */
export async function requireSignedIn(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}
