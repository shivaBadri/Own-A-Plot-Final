import Link from "next/link";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/admin/PageHeader";
import SearchBar from "@/components/admin/SearchBar";
import AdminPagination from "@/components/admin/AdminPagination";
import EmptyState from "@/components/admin/EmptyState";
import { requirePageAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    published?: string;
    page?: string;
  }>;
}

export default async function AdminProjectsPage({ searchParams }: Props) {
  await requirePageAccess("ventures:view");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.ProjectWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ];
  }
  if (
    params.status === "UPCOMING" ||
    params.status === "ONGOING" ||
    params.status === "COMPLETED"
  ) {
    where.status = params.status;
  }
  if (params.published === "true") where.isPublished = true;
  if (params.published === "false") where.isPublished = false;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      include: { _count: { select: { plots: true, enquiries: true } } },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.project.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const isFiltered = Boolean(q || params.status || params.published);

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Ventures"
        description="Every venture on the site, published or otherwise."
        action={{ href: "/admin/projects/new", label: "New venture" }}
      />

      <SearchBar
        placeholder="Search ventures"
        total={total}
        filters={[
          {
            name: "status",
            label: "Status",
            options: [
              { value: "", label: "Any" },
              { value: "ONGOING", label: "Ongoing" },
              { value: "UPCOMING", label: "Upcoming" },
              { value: "COMPLETED", label: "Completed" },
            ],
          },
          {
            name: "published",
            label: "Visibility",
            options: [
              { value: "", label: "All" },
              { value: "true", label: "Published" },
              { value: "false", label: "Draft" },
            ],
          },
        ]}
      />

      {projects.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={isFiltered ? "Nothing matches that." : "No ventures yet."}
            body={
              isFiltered
                ? "Try a different search, or clear the filters."
                : "Create the first venture and it will appear across the site immediately."
            }
            action={
              isFiltered
                ? undefined
                : { href: "/admin/projects/new", label: "Create a venture" }
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-10 overflow-x-auto">
            <table className="table-admin min-w-[820px]">
              <thead>
                <tr>
                  <th>Venture</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Plots</th>
                  <th>Enquiries</th>
                  <th>Visibility</th>
                  <th>Updated</th>
                  <th className="sr-only">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const thumb = project.heroImage ?? project.coverImage;
                  return (
                    <tr key={project.id}>
                      <td>
                        <div className="flex items-center gap-4">
                          {thumb ? (
                            <span className="relative h-12 w-16 shrink-0 overflow-hidden border border-charcoal/10">
                              <Image
                                src={thumb}
                                alt=""
                                fill
                                sizes="64px"
                                className="object-cover"
                                unoptimized
                              />
                            </span>
                          ) : (
                            <span className="h-12 w-16 shrink-0 border border-charcoal/10 bg-sand/25" />
                          )}
                          <span className="min-w-0">
                            <Link
                              href={`/admin/projects/${project.id}/edit`}
                              className="link-underline block font-serif text-base"
                            >
                              {project.name}
                            </Link>
                            <span className="mt-0.5 block text-[11px] text-muted">
                              /{project.slug}
                              {project.featured && " · Featured"}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="text-muted">{project.location}</td>
                      <td>
                        <span
                          className={
                            project.status === "ONGOING"
                              ? "chip-live"
                              : project.status === "COMPLETED"
                                ? "chip-neutral"
                                : "chip-warn"
                          }
                        >
                          {project.status}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/admin/plots?projectId=${project.id}`}
                          className="link-underline"
                        >
                          {project._count.plots}
                        </Link>
                      </td>
                      <td className="text-muted">{project._count.enquiries}</td>
                      <td>
                        <span
                          className={
                            project.isPublished ? "chip-live" : "chip-neutral"
                          }
                        >
                          {project.isPublished ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-muted">
                        {formatDate(project.updatedAt)}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/admin/projects/${project.id}/edit`}
                          className="link-underline whitespace-nowrap text-[10px] uppercase tracking-[0.22em]"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AdminPagination page={page} totalPages={totalPages} />
        </>
      )}
    </>
  );
}
