import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCmsSection } from "@/lib/cms";
import { getSettings } from "@/lib/settings";
import { formatPriceShort, formatSqft } from "@/lib/format";
import PlotFilters from "@/components/public/PlotFilters";
import Pagination from "@/components/public/Pagination";

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

export async function generateMetadata(): Promise<Metadata> {
  const [cms, settings] = await Promise.all([
    getCmsSection("plotsPage"),
    getSettings(),
  ]);
  return {
    title: "Plots",
    description: cms.intro || settings.defaultSeoDescription,
    alternates: { canonical: "/plots" },
  };
}

interface Props {
  searchParams: Promise<{
    venture?: string;
    size?: string;
    sort?: string;
    page?: string;
  }>;
}

/**
 * The approved frontend had no plots page — it had no plots data. The schema
 * does, so this page is built from the same primitives: the divided filter bar
 * from /ventures, the hairline card grid from the venture detail page.
 */
export default async function PlotsPage({ searchParams }: Props) {
  const params = await searchParams;
  const venture = params.venture?.trim() ?? "";
  const size = params.size?.trim() ?? "";
  const sort = params.sort?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  // Only plots inside a published venture are ever public.
  const where: Prisma.PlotWhereInput = {
    status: "AVAILABLE",
    project: { isPublished: true },
  };

  if (venture) {
    where.project = { isPublished: true, slug: venture };
  }
  if (size === "s") where.sizeSqft = { lt: 1800 };
  if (size === "m") where.sizeSqft = { gte: 1800, lte: 3600 };
  if (size === "l") where.sizeSqft = { gt: 3600 };

  const orderBy: Prisma.PlotOrderByWithRelationInput =
    sort === "size-asc"
      ? { sizeSqft: "asc" }
      : sort === "size-desc"
        ? { sizeSqft: "desc" }
        : sort === "price-asc"
          ? { price: "asc" }
          : sort === "price-desc"
            ? { price: "desc" }
            : { createdAt: "desc" };

  const [cms, plots, total, totalAvailable, ventures] = await Promise.all([
    getCmsSection("plotsPage"),
    prisma.plot.findMany({
      where,
      include: { project: true },
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.plot.count({ where }),
    prisma.plot.count({
      where: { status: "AVAILABLE", project: { isPublished: true } },
    }),
    prisma.project.findMany({
      where: { isPublished: true, plots: { some: { status: "AVAILABLE" } } },
      select: { slug: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
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

      <PlotFilters
        ventures={ventures}
        resultCount={total}
        totalCount={totalAvailable}
        initialVenture={venture}
        initialSize={size}
        initialSort={sort}
      />

      <section className="section-y">
        <div className="container-page">
          {plots.length === 0 ? (
            <div className="border border-charcoal/10 bg-sand/20 px-8 py-20 text-center">
              <p className="font-serif text-h3">No plots match that.</p>
              <p className="prose-max mx-auto mt-6 text-body text-muted">
                {totalAvailable > 0
                  ? "Try a different venture or size — or clear the filters to see everything that is open."
                  : "Nothing is open for sale at this moment. Leave your details and we will write the day a plot is released."}
              </p>
              <Link
                href={totalAvailable > 0 ? "/plots" : "/contact"}
                className="btn-luxury mt-10"
              >
                {totalAvailable > 0 ? "Clear Filters" : "Register Interest"}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-px border border-charcoal/10 bg-charcoal/10 sm:grid-cols-2 lg:grid-cols-3">
                {plots.map((plot) => (
                  <Link
                    key={plot.id}
                    href={`/plots/${plot.id}`}
                    data-reveal
                    className="group flex flex-col bg-cream transition-colors duration-500 hover:bg-sand/25 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-charcoal"
                  >
                    {plot.project.coverImage || plot.project.heroImage ? (
                      <div className="relative aspect-[16/10] w-full overflow-hidden">
                        <Image
                          src={
                            (plot.project.heroImage ||
                              plot.project.coverImage) as string
                          }
                          alt={plot.project.name}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <p className="absolute bottom-4 left-6 text-[10px] uppercase tracking-[0.28em] text-cream">
                          {plot.project.name}
                        </p>
                      </div>
                    ) : null}

                    <div className="flex flex-1 flex-col justify-between gap-8 p-8">
                      <div>
                        <p className="eyebrow">Plot</p>
                        <p className="mt-3 font-serif text-h3">
                          {plot.plotNumber}
                        </p>
                        <p className="mt-4 text-body text-muted">
                          {formatSqft(plot.sizeSqft)}
                          {plot.facing ? ` · ${plot.facing} facing` : ""}
                        </p>
                      </div>

                      <div className="flex items-end justify-between border-t border-charcoal/15 pt-6">
                        <span className="font-serif text-h4">
                          {formatPriceShort(plot.price, plot.priceOnRequest)}
                        </span>
                        <span className="flex h-10 w-10 items-center justify-center border border-charcoal/30 transition-all duration-500 group-hover:bg-charcoal group-hover:text-cream">
                          <ArrowRight size={15} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                basePath="/plots"
                params={{ venture, size, sort }}
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}
