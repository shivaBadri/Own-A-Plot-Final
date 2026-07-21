import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatPriceShort, formatDate } from "@/lib/format";
import PageHeader from "@/components/admin/PageHeader";
import type { DashboardStats } from "@/types";
import { requirePageAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

async function getStats(): Promise<DashboardStats> {
  const [
    totalProjects,
    publishedProjects,
    totalPlots,
    plotsAvailable,
    plotsReserved,
    plotsSold,
    newEnquiries,
    totalEnquiries,
    totalMedia,
    soldAggregate,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { isPublished: true } }),
    prisma.plot.count(),
    prisma.plot.count({ where: { status: "AVAILABLE" } }),
    prisma.plot.count({ where: { status: "RESERVED" } }),
    prisma.plot.count({ where: { status: { in: ["SOLD", "BOOKED"] } } }),
    prisma.enquiry.count({ where: { status: "NEW" } }),
    prisma.enquiry.count(),
    prisma.media.count(),
    prisma.plot.aggregate({
      // Booked money is committed money — a plan that counts only SOLD
      // understates the position by an entire pipeline stage.
      where: { status: { in: ["SOLD", "BOOKED"] }, priceOnRequest: false },
      _sum: { price: true },
    }),
  ]);

  return {
    totalProjects,
    publishedProjects,
    totalPlots,
    plotsAvailable,
    plotsReserved,
    plotsSold,
    newEnquiries,
    totalEnquiries,
    totalMedia,
    soldValue: soldAggregate._sum.price ?? 0,
  };
}

export default async function AdminDashboardPage() {
  await requirePageAccess("dashboard:view");
  const [stats, recentEnquiries, draftProjects] = await Promise.all([
    getStats(),
    prisma.enquiry.findMany({
      include: { project: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.project.findMany({
      where: { isPublished: false },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, name: true, updatedAt: true },
    }),
  ]);

  const cards = [
    {
      label: "Ventures",
      value: stats.totalProjects,
      sub: `${stats.publishedProjects} published`,
      href: "/admin/projects",
    },
    {
      label: "Plots",
      value: stats.totalPlots,
      sub: `${stats.plotsAvailable} available · ${stats.plotsReserved} reserved`,
      href: "/admin/plots",
    },
    {
      label: "Plots sold",
      value: stats.plotsSold,
      sub:
        stats.soldValue > 0
          ? `${formatPriceShort(stats.soldValue)} booked`
          : "No value recorded",
      href: "/admin/plots?status=SOLD",
    },
    {
      label: "New enquiries",
      value: stats.newEnquiries,
      sub: `${stats.totalEnquiries} all time`,
      href: "/admin/enquiries?status=NEW",
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Everything currently moving across the site."
      />

      <div className="mt-10 grid grid-cols-1 gap-px border border-charcoal/10 bg-charcoal/10 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group bg-cream p-8 transition-colors duration-500 hover:bg-sand/25"
          >
            <p className="label-admin">{card.label}</p>
            <p className="mt-4 font-serif text-h1 leading-none">{card.value}</p>
            <p className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted">
              {card.sub}
              <ArrowRight
                size={12}
                className="opacity-0 transition-all duration-500 group-hover:translate-x-1 group-hover:opacity-100"
              />
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Recent enquiries */}
        <section className="lg:col-span-7">
          <div className="flex items-end justify-between gap-6 border-b border-charcoal/20 pb-3">
            <h2 className="font-serif text-h4">Recent enquiries</h2>
            <Link
              href="/admin/enquiries"
              className="link-underline text-[10px] uppercase tracking-[0.28em] text-muted"
            >
              View all
            </Link>
          </div>

          {recentEnquiries.length === 0 ? (
            <p className="py-10 text-admin-body text-muted">
              No enquiries yet. They will appear here the moment one arrives.
            </p>
          ) : (
            <ul className="divide-y divide-charcoal/10">
              {recentEnquiries.map((enquiry) => (
                <li
                  key={enquiry.id}
                  className="flex items-start justify-between gap-6 py-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-serif text-base">
                      {enquiry.name}
                    </p>
                    <p className="mt-1 truncate text-[11px] uppercase tracking-[0.2em] text-muted">
                      {enquiry.project?.name ?? enquiry.interest ?? "General"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={
                        enquiry.status === "NEW"
                          ? "chip-live"
                          : enquiry.status === "CONTACTED"
                            ? "chip-warn"
                            : "chip-neutral"
                      }
                    >
                      {enquiry.status}
                    </span>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-muted">
                      {formatDate(enquiry.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Drafts + quick actions */}
        <section className="lg:col-span-5">
          <div className="flex items-end justify-between gap-6 border-b border-charcoal/20 pb-3">
            <h2 className="font-serif text-h4">Unpublished drafts</h2>
            <Link
              href="/admin/projects?published=false"
              className="link-underline text-[10px] uppercase tracking-[0.28em] text-muted"
            >
              View all
            </Link>
          </div>

          {draftProjects.length === 0 ? (
            <p className="py-10 text-admin-body text-muted">
              Nothing sitting in draft. Everything is live.
            </p>
          ) : (
            <ul className="divide-y divide-charcoal/10">
              {draftProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/admin/projects/${project.id}/edit`}
                    className="group flex items-center justify-between gap-6 py-5"
                  >
                    <span className="min-w-0 truncate font-serif text-base">
                      {project.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-muted">
                      {formatDate(project.updatedAt)}
                      <ArrowRight
                        size={12}
                        className="transition-transform duration-500 group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/admin/projects/new" className="btn-admin">
              New venture
            </Link>
            <Link href="/admin/plots/new" className="btn-admin">
              New plot
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
