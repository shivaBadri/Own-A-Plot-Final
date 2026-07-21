import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNewEnquiryCount } from "@/lib/cache";
import { ROLE_LABELS } from "@/lib/permissions";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

/**
 * The authoritative gate.
 *
 * Middleware already checked the JWT on the Edge, but the claims in that token
 * are a seven-day-old snapshot. This layout re-reads the employee from
 * Postgres on every admin request, which is what makes a deactivation or a
 * role change take effect on the NEXT navigation rather than whenever the
 * cookie happens to expire. `getCurrentUser()` returns null for a deleted or
 * deactivated account, so both cases land on the login page.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const newEnquiries = user.permissions.has("enquiries:view")
    ? await getNewEnquiryCount()
    : 0;

  return (
    <AdminShell
      admin={{
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        roleLabel: ROLE_LABELS[user.role],
      }}
      newEnquiries={newEnquiries}
      permissions={[...user.permissions]}
    >
      {children}
    </AdminShell>
  );
}
