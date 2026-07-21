import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageAccess } from "@/lib/guard";
import { formatDateTime } from "@/lib/format";
import { actionLabel } from "@/lib/activity";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import PageHeader from "@/components/admin/PageHeader";
import EmployeeForm from "@/components/admin/EmployeeForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: Props) {
  const user = await requirePageAccess("employees:edit");
  const { id } = await params;

  const [employee, recentActivity] = await Promise.all([
    prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        phone: true,
        jobTitle: true,
        permissionGrants: true,
        permissionRevokes: true,
        mustChangePassword: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        createdBy: { select: { name: true } },
      },
    }),
    // The last twenty things this person did, shown on their own record so an
    // administrator does not have to go filter the global log to answer
    // "what has she been doing?".
    prisma.activityLog.findMany({
      where: { actorId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        summary: true,
        createdAt: true,
        ip: true,
      },
    }),
  ]);

  if (!employee) notFound();

  const isSelf = employee.id === user.id;
  const canDelete =
    user.permissions.has("employees:delete") &&
    !isSelf &&
    (employee.role !== "SUPER_ADMIN" || user.role === "SUPER_ADMIN");

  return (
    <>
      <PageHeader
        eyebrow="People"
        title={employee.name}
        description={`${ROLE_LABELS[employee.role as Role]} · ${employee.email}`}
      />

      <dl className="mt-8 grid grid-cols-1 gap-px border border-charcoal/10 bg-charcoal/10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-cream p-6">
          <dt className="label-admin">Last sign-in</dt>
          <dd className="mt-2 text-admin-body">
            {employee.lastLoginAt ? formatDateTime(employee.lastLoginAt) : "Never"}
          </dd>
        </div>
        <div className="bg-cream p-6">
          <dt className="label-admin">Last IP</dt>
          <dd className="mt-2 text-admin-body">{employee.lastLoginIp ?? "—"}</dd>
        </div>
        <div className="bg-cream p-6">
          <dt className="label-admin">Added</dt>
          <dd className="mt-2 text-admin-body">
            {formatDateTime(employee.createdAt)}
          </dd>
        </div>
        <div className="bg-cream p-6">
          <dt className="label-admin">Added by</dt>
          <dd className="mt-2 text-admin-body">
            {employee.createdBy?.name ?? "—"}
          </dd>
        </div>
      </dl>

      <EmployeeForm
        employee={{
          id: employee.id,
          name: employee.name,
          email: employee.email,
          avatarUrl: employee.avatarUrl,
          role: employee.role as Role,
          isActive: employee.isActive,
          phone: employee.phone,
          jobTitle: employee.jobTitle,
          permissionGrants: employee.permissionGrants,
          permissionRevokes: employee.permissionRevokes,
          mustChangePassword: employee.mustChangePassword,
        }}
        actorPermissions={[...user.permissions]}
        actorIsSuperAdmin={user.role === "SUPER_ADMIN"}
        isSelf={isSelf}
        canDelete={canDelete}
      />

      <section className="mt-16 border-t border-charcoal/10 pt-10">
        <div className="flex items-end justify-between gap-6 border-b border-charcoal/20 pb-3">
          <h2 className="font-serif text-h4">Recent activity</h2>
          <Link
            href={`/admin/activity?actorId=${employee.id}`}
            className="link-underline text-[10px] uppercase tracking-[0.28em] text-muted"
          >
            View all
          </Link>
        </div>

        {recentActivity.length === 0 ? (
          <p className="py-10 text-admin-body text-muted">
            Nothing recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-charcoal/10">
            {recentActivity.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="text-admin-body">{entry.summary}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted">
                    {actionLabel(entry.action)}
                    {entry.ip ? ` · ${entry.ip}` : ""}
                  </p>
                </div>
                <span className="whitespace-nowrap text-[11px] text-muted">
                  {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
