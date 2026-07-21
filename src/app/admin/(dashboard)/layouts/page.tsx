import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageAccess } from "@/lib/guard";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";

export const dynamic = "force-dynamic";

export default async function AdminLayoutsPage() {
  const user = await requirePageAccess("layouts:view");

  const layouts = await prisma.layout.findMany({
    orderBy: [{ project: { name: "asc" } }, { sortOrder: "asc" }],
    include: {
      project: { select: { id: true, name: true, slug: true } },
      _count: { select: { shapes: true } },
    },
  });

  const canCreate = user.permissions.has("layouts:create");

  return (
    <>
      <PageHeader
        eyebrow="Ventures"
        title="Layout Management"
        description="Master plans and the plot boundaries drawn over them."
        action={
          canCreate
            ? { href: "/admin/layouts/new", label: "New layout" }
            : undefined
        }
      />

      {layouts.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No layouts yet."
            body="Upload a venture's master plan, trace its plots, and it becomes an interactive map on the public site."
            action={
              canCreate
                ? { href: "/admin/layouts/new", label: "Upload a plan" }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-10 overflow-x-auto">
          <table className="table-admin min-w-[820px]">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Venture</th>
                <th>Boundaries</th>
                <th>Status</th>
                <th>Updated</th>
                <th className="sr-only">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layouts.map((layout) => (
                <tr key={layout.id}>
                  <td>
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={layout.imageUrl}
                        alt=""
                        className="h-12 w-16 shrink-0 border border-charcoal/10 object-cover"
                      />
                      <Link
                        href={`/admin/layouts/${layout.id}/edit`}
                        className="link-underline font-serif text-base"
                      >
                        {layout.name}
                      </Link>
                    </div>
                  </td>
                  <td className="text-muted">{layout.project.name}</td>
                  <td>{layout._count.shapes}</td>
                  <td>
                    <span
                      className={
                        layout.isPublished ? "chip-live" : "chip-neutral"
                      }
                    >
                      {layout.isPublished ? "Live" : "Draft"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-muted">
                    {formatDate(layout.updatedAt)}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/admin/layouts/${layout.id}/edit`}
                      className="link-underline whitespace-nowrap text-[10px] uppercase tracking-[0.22em]"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
