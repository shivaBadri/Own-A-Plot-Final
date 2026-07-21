import Link from "next/link";
import { Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { landingPathFor, ROLE_LABELS } from "@/lib/permissions";
import PageHeader from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ from?: string }>;
}

/**
 * A real page rather than a redirect loop.
 *
 * An employee who follows a stale link or an emailed URL should be told what
 * happened and handed a way back — not silently bounced to the dashboard,
 * which is itself a page some roles cannot open.
 */
export default async function NoAccessPage({ searchParams }: Props) {
  const { from } = await searchParams;
  const user = await getCurrentUser();

  const backHref = user ? landingPathFor(user) : "/admin/login";

  return (
    <>
      <PageHeader
        eyebrow="Access"
        title="Not available to your role"
        description="Your account is signed in, but this section is outside what your role can open."
      />

      <div className="mt-10 max-w-2xl border border-charcoal/10 p-8 md:p-10">
        <span className="flex h-12 w-12 items-center justify-center border border-charcoal/20">
          <Lock size={18} strokeWidth={1.4} />
        </span>

        <p className="mt-8 text-admin-body text-muted">
          {user ? (
            <>
              You are signed in as{" "}
              <span className="text-charcoal">{user.name}</span> with the{" "}
              <span className="text-charcoal">{ROLE_LABELS[user.role]}</span>{" "}
              role.
            </>
          ) : (
            <>Your session has ended.</>
          )}
        </p>

        {from && (
          <p className="mt-4 text-admin-body text-muted">
            Requested page:{" "}
            <span className="break-all text-charcoal">{from}</span>
          </p>
        )}

        <p className="mt-4 text-admin-body text-muted">
          If you need this section, ask a Super Admin to adjust your role or
          grant the specific permission on your employee record.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={backHref} className="btn-admin-solid">
            Back to my workspace
          </Link>
          <Link href="/admin/profile" className="btn-admin">
            My profile
          </Link>
        </div>
      </div>
    </>
  );
}
