import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCmsSection } from "@/lib/cms";
import { getSettings } from "@/lib/settings";
import { toVentures, isOpen, ACCENT_BAR, ACCENT_TEXT } from "@/lib/content";
import VentureFilters from "@/components/public/VentureFilters";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [cms, settings] = await Promise.all([
    getCmsSection("venturesPage"),
    getSettings(),
  ]);
  return {
    title: "Ventures",
    description: cms.intro || settings.defaultSeoDescription,
    alternates: { canonical: "/ventures" },
  };
}

interface Props {
  searchParams: Promise<{ q?: string; location?: string; status?: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  ONGOING: "Now open",
  UPCOMING: "Coming soon",
  COMPLETED: "Fully subscribed",
};

export default async function VenturesPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const location = params.location?.trim() ?? "";
  const status = params.status?.trim() ?? "";

  const where: Prisma.ProjectWhereInput = { isPublished: true };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
      { tagline: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { region: { contains: q, mode: "insensitive" } },
    ];
  }
  if (location) {
    where.location = location;
  }
  if (status === "ONGOING" || status === "UPCOMING" || status === "COMPLETED") {
    where.status = status;
  }

  const [cms, projects, locationRows, totalPublished] = await Promise.all([
    getCmsSection("venturesPage"),
    prisma.project.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    // Distinct locations across every published venture — the filter list must
    // not shrink to only the locations that survived the current filter.
    prisma.project.findMany({
      where: { isPublished: true },
      select: { location: true },
      distinct: ["location"],
      orderBy: { location: "asc" },
    }),
    prisma.project.count({ where: { isPublished: true } }),
  ]);

  const ventures = toVentures(projects);
  const locations = locationRows.map((row) => row.location);
  const isFiltered = Boolean(q || location || status);

  return (
    <>
      {/* Header */}
      <section className="pt-40 md:pt-48">
        <div className="container-page">
          <p className="eyebrow animate-fadeIn">{cms.eyebrow}</p>
          <h1 className="mt-6 max-w-3xl animate-fadeUp font-serif text-h1 leading-[1.05]">
            {cms.title}
          </h1>
          <p className="prose-max mt-8 animate-fadeUp text-body text-muted [animation-delay:120ms]">
            {cms.intro}
          </p>
        </div>
      </section>

      {/* Filters — server-driven, unlike the reference build where they were decorative. */}
      <VentureFilters
        locations={locations}
        resultCount={ventures.length}
        totalCount={totalPublished}
        initialQuery={q}
        initialLocation={location}
        initialStatus={status}
      />

      {/* Editorial listing */}
      <section className="section-y">
        <div className="container-page space-y-32 md:space-y-40">
          {ventures.length === 0 && (
            <div className="border border-charcoal/10 bg-sand/20 px-8 py-20 text-center">
              <p className="font-serif text-h3">
                {isFiltered
                  ? "Nothing matches that search."
                  : "The collection is being drawn."}
              </p>
              <p className="prose-max mx-auto mt-6 text-body text-muted">
                {isFiltered
                  ? "Try a different corridor, or clear the filters to see the whole collection."
                  : "No ventures are open for preview at the moment. Leave your details and we will write when the first one opens."}
              </p>
              <Link
                href={isFiltered ? "/ventures" : "/contact"}
                className="btn-luxury mt-10"
              >
                {isFiltered ? "Clear Filters" : "Register Interest"}
              </Link>
            </div>
          )}

          {ventures.map((v, idx) => {
            const reverse = idx % 2 === 1;
            const open = isOpen(v);
            return (
              <article
                key={v.slug}
                data-reveal
                className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-24"
              >
                <div
                  className={`relative aspect-[4/5] w-full overflow-hidden lg:col-span-7 ${
                    reverse ? "lg:order-2" : ""
                  }`}
                >
                  <Image
                    src={v.heroImage}
                    alt={v.name}
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-cover"
                  />
                  <span
                    className={`absolute left-0 top-0 h-1 w-24 ${
                      ACCENT_BAR[v.accent]
                    }`}
                    aria-hidden
                  />
                </div>

                <div className={`lg:col-span-5 ${reverse ? "lg:order-1" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        open ? "bg-olive" : "bg-charcoal/40"
                      }`}
                    />
                    <p className="eyebrow">
                      {STATUS_LABELS[v.status] ?? "Coming soon"}
                    </p>
                  </div>
                  <h2 className="mt-6 font-serif text-h2">{v.name}</h2>
                  <p className="mt-3 text-sm uppercase tracking-[0.22em] text-charcoal/70">
                    {v.location}
                  </p>

                  <p className="prose-max mt-10 text-body text-muted">
                    {v.tagline}
                  </p>

                  <div className="mt-12 grid grid-cols-2 gap-8 border-t border-charcoal/15 pt-8">
                    <div>
                      <p className="eyebrow">Extent</p>
                      <p className="mt-2 font-serif text-h4">
                        {v.totalAcres ?? "—"}
                        <span className="ml-1 text-sm text-muted">acres</span>
                      </p>
                    </div>
                    <div>
                      <p className="eyebrow">Status</p>
                      <p
                        className={`mt-2 font-serif text-h4 ${
                          open ? ACCENT_TEXT[v.accent] : "text-muted"
                        }`}
                      >
                        {open ? "Open" : "Preview"}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/ventures/${v.slug}`}
                    className="btn-luxury group mt-12"
                  >
                    View Venture
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-500 group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
