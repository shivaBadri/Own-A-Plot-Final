import { AlertTriangle } from "lucide-react";
import { requireSignedIn } from "@/lib/guard";
import { ROLE_LABELS, RESOURCE_LABELS, ACTION_LABELS } from "@/lib/permissions";
import type { Resource, Action } from "@/lib/permissions";
import PageHeader from "@/components/admin/PageHeader";
import ProfileForm from "@/components/admin/ProfileForm";

export const dynamic = "force-dynamic";

/**
 * Open to every signed-in employee whatever their role — it is the one page a
 * Layout Designer and a Super Admin have equally.
 */
export default async function AdminProfilePage() {
  const user = await requireSignedIn();

  // Grouped for display: "Ventures — View, Create, Edit" reads; a flat list of
  // 40 `resource:action` strings does not.
  const grouped = new Map<Resource, Action[]>();
  for (const permission of user.permissions) {
    const [resource, action] = permission.split(":") as [Resource, Action];
    grouped.set(resource, [...(grouped.get(resource) ?? []), action]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Your name, avatar, and password."
      />

      {user.mustChangePassword && (
        <div className="mt-8 flex items-start gap-4 border border-earth/40 bg-earth/5 p-6">
          <AlertTriangle
            size={18}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-earth"
          />
          <div>
            <p className="font-serif text-base">Set a new password</p>
            <p className="mt-2 text-admin-body text-muted">
              An administrator reset your password. Choose your own below before
              you carry on.
            </p>
          </div>
        </div>
      )}

      <ProfileForm
        admin={{
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        }}
      />

      <section className="mt-16 border-t border-charcoal/10 pt-10">
        <p className="eyebrow">Access</p>
        <h2 className="mt-3 font-serif text-admin-h1">
          {ROLE_LABELS[user.role]}
        </h2>
        <p className="prose-max mt-3 text-admin-body text-muted">
          What your role allows. To change any of it, ask a Super Admin.
        </p>

        <dl className="mt-10 grid grid-cols-1 gap-px border border-charcoal/10 bg-charcoal/10 sm:grid-cols-2 lg:grid-cols-3">
          {[...grouped.entries()].map(([resource, actions]) => (
            <div key={resource} className="bg-cream p-6">
              <dt className="label-admin">{RESOURCE_LABELS[resource]}</dt>
              <dd className="mt-3 text-admin-body">
                {actions
                  .map((action) => ACTION_LABELS[action])
                  .join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
