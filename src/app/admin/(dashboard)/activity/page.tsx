import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePageAccess } from "@/lib/guard";
import { formatDateTime } from "@/lib/format";
import { actionLabel } from "@/lib/activity";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import PageHeader from "@/components/admin/PageHeader";
import SearchBar from "@/components/admin/SearchBar";
import AdminPagination from "@/components/admin/AdminPagination";
import EmptyState from "@/components/admin/EmptyState";

export const dynamic = "force-dynamic";

const PER_PAGE = 40;

interface Props {
  searchParams: Promise<{
    q?: string;
    entity?: string;
    actorId?: string;
    page?: string;
  }>;
}

/**
 * The audit trail, read-only.
 *
 * There is intentionally no delete control anywhere on this page or its API —
 * a log an administrator can quietly edit answers no question worth asking.
 */
export default async function AdminActivityPage({ searchParams }: Props) {
  await requirePageAccess("employees:view");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.ActivityLogWhereInput = {};
  if (q) {
    where.OR = [
      { summary: { contains: q, mode: "insensitive" } },
      { actorName: { contains: q, mode: "insensitive" } },
      { actorEmail: { contains: q, mode: "insensitive" } },
    ];
  }
  if (params.entity) where.entity = params.entity;
  if (params.actorId) where.actorId = params.actorId;

  const [entries, total, actor] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.activityLog.count({ where }),
    params.actorId
      ? prisma.admin.findUnique({
          where: { id: params.actorId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Activity"
        description={
          actor
            ? `Everything ${actor.name} has done in this admin.`
            : "Every sign-in, edit, publish and deletion, oldest at the bottom."
        }
      />

      {params.actorId && (
        <p className="mt-6 text-admin-body text-muted">
          Filtered to one person.{" "}
          <Link href="/admin/activity" className="link-underline text-charcoal">
            Show everyone
          </Link>
        </p>
      )}

      <SearchBar
        placeholder="Search the log"
        total={total}
        filters={[
          {
            name: "entity",
            label: "Area",
            options: [
              { value: "", label: "Everything" },
              { value: "Admin", label: "Employees & auth" },
              { value: "Project", label: "Ventures" },
              { value: "Plot", label: "Plots" },
              { value: "Layout", label: "Layouts" },
              { value: "Enquiry", label: "Enquiries" },
              { value: "Media", label: "Media" },
              { value: "CmsSection", label: "Content" },
              { value: "SiteSettings", label: "Settings" },
            ],
          },
        ]}
      />

      {entries.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nothing recorded yet."
            body="Actions taken in the admin will appear here as they happen."
          />
        </div>
      ) : (
        <>
          <div className="mt-10 overflow-x-auto">
            <table className="table-admin min-w-[880px]">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>What happened</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-muted">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td>
                      <span className="block font-serif text-base">
                        {entry.actorName}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {entry.actorRole
                          ? ROLE_LABELS[entry.actorRole as Role]
                          : entry.actorEmail}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          entry.action.endsWith("delete") ||
                          entry.action.endsWith("login_failed")
                            ? "chip-danger"
                            : entry.action.endsWith("publish")
                              ? "chip-live"
                              : "chip-neutral"
                        }
                      >
                        {actionLabel(entry.action)}
                      </span>
                    </td>
                    <td>{entry.summary}</td>
                    <td className="whitespace-nowrap text-muted">
                      {entry.ip ?? "—"}
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
