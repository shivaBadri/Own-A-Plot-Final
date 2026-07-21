import Link from "next/link";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePageAccess } from "@/lib/guard";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/permissions";
import PageHeader from "@/components/admin/PageHeader";
import SearchBar from "@/components/admin/SearchBar";
import AdminPagination from "@/components/admin/AdminPagination";
import EmptyState from "@/components/admin/EmptyState";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

interface Props {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminEmployeesPage({ searchParams }: Props) {
  const user = await requirePageAccess("employees:view");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.AdminWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { jobTitle: { contains: q, mode: "insensitive" } },
    ];
  }
  if (params.role && ROLES.includes(params.role as Role)) {
    where.role = params.role as Role;
  }
  if (params.status === "active") where.isActive = true;
  if (params.status === "inactive") where.isActive = false;

  const [employees, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        jobTitle: true,
        lastLoginAt: true,
        mustChangePassword: true,
      },
      // Active people first — an inactive account is an archive entry, not
      // something you scroll past looking for a colleague.
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.admin.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const isFiltered = Boolean(q || params.role || params.status);
  const canCreate = user.permissions.has("employees:create");
  const canEdit = user.permissions.has("employees:edit");

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Employees"
        description="Everyone with access to this admin, and what they can reach."
        action={
          canCreate
            ? { href: "/admin/employees/new", label: "New employee" }
            : undefined
        }
      />

      <SearchBar
        placeholder="Search by name, email or title"
        total={total}
        filters={[
          {
            name: "role",
            label: "Role",
            options: [
              { value: "", label: "Any role" },
              ...ROLES.map((role) => ({
                value: role,
                label: ROLE_LABELS[role],
              })),
            ],
          },
          {
            name: "status",
            label: "Status",
            options: [
              { value: "", label: "All" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Deactivated" },
            ],
          },
        ]}
      />

      {employees.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={isFiltered ? "Nothing matches that." : "No employees yet."}
            body={
              isFiltered
                ? "Try a different search, or clear the filters."
                : "Add your first colleague and choose what they can reach."
            }
            action={
              isFiltered || !canCreate
                ? undefined
                : { href: "/admin/employees/new", label: "Add an employee" }
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-10 overflow-x-auto">
            <table className="table-admin min-w-[860px]">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Title</th>
                  <th>Last sign-in</th>
                  <th>Status</th>
                  <th className="sr-only">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="flex items-center gap-4">
                        {employee.avatarUrl ? (
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                            <Image
                              src={employee.avatarUrl}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          </span>
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-charcoal/20 font-serif text-sm">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0">
                          {canEdit ? (
                            <Link
                              href={`/admin/employees/${employee.id}/edit`}
                              className="link-underline block font-serif text-base"
                            >
                              {employee.name}
                            </Link>
                          ) : (
                            <span className="block font-serif text-base">
                              {employee.name}
                            </span>
                          )}
                          <span className="mt-0.5 block text-[11px] text-muted">
                            {employee.email}
                            {employee.id === user.id && " · you"}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          employee.role === "SUPER_ADMIN"
                            ? "chip-warn"
                            : "chip-neutral"
                        }
                      >
                        {ROLE_LABELS[employee.role as Role]}
                      </span>
                    </td>
                    <td className="text-muted">{employee.jobTitle ?? "—"}</td>
                    <td className="whitespace-nowrap text-muted">
                      {employee.lastLoginAt
                        ? formatDateTime(employee.lastLoginAt)
                        : "Never"}
                    </td>
                    <td>
                      <span
                        className={
                          employee.isActive ? "chip-live" : "chip-danger"
                        }
                      >
                        {employee.isActive ? "Active" : "Deactivated"}
                      </span>
                      {employee.mustChangePassword && employee.isActive && (
                        <span className="mt-2 block text-[10px] uppercase tracking-[0.2em] text-muted">
                          Password reset pending
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {canEdit && (
                        <Link
                          href={`/admin/employees/${employee.id}/edit`}
                          className="link-underline whitespace-nowrap text-[10px] uppercase tracking-[0.22em]"
                        >
                          Manage
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} />
        </>
      )}
    </>
  );
}
