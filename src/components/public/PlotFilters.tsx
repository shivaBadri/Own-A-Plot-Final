"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, X } from "lucide-react";

/**
 * Plot filters. Same divided-grid geometry as the ventures filter bar, so the
 * two listings read as one family. URL-driven for the same reasons: shareable,
 * back-button-correct, and the page stays a server component.
 */
export default function PlotFilters({
  ventures,
  resultCount,
  totalCount,
  initialVenture,
  initialSize,
  initialSort,
}: {
  ventures: { slug: string; name: string }[];
  resultCount: number;
  totalCount: number;
  initialVenture: string;
  initialSize: string;
  initialSort: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/plots?${qs}` : "/plots", { scroll: false });
    });
  }

  const isFiltered = Boolean(initialVenture || initialSize || initialSort);

  return (
    <section className="mt-20 border-y border-charcoal/10">
      <div className="container-page">
        <div className="grid grid-cols-1 divide-y divide-charcoal/10 md:grid-cols-4 md:divide-x md:divide-y-0">
          <div className="flex items-center justify-between gap-4 py-6 md:pr-8">
            <span className="eyebrow">Filter</span>
            <span className="flex items-center gap-2 whitespace-nowrap text-xs uppercase tracking-[0.24em] text-muted">
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isFiltered ? `${resultCount} of ${totalCount}` : `${totalCount} Plots`}
            </span>
          </div>

          <label className="flex items-center gap-4 py-6 md:px-8">
            <span className="eyebrow whitespace-nowrap">Venture</span>
            <select
              value={initialVenture}
              onChange={(e) => setParam("venture", e.target.value)}
              aria-label="Filter by venture"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm uppercase tracking-[0.18em] text-charcoal focus:outline-none focus:ring-0"
            >
              <option value="">All ventures</option>
              {ventures.map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-4 py-6 md:px-8">
            <span className="eyebrow whitespace-nowrap">Size</span>
            <select
              value={initialSize}
              onChange={(e) => setParam("size", e.target.value)}
              aria-label="Filter by size"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm uppercase tracking-[0.18em] text-charcoal focus:outline-none focus:ring-0"
            >
              <option value="">Any size</option>
              <option value="s">Under 1,800 sq ft</option>
              <option value="m">1,800 – 3,600 sq ft</option>
              <option value="l">Over 3,600 sq ft</option>
            </select>
          </label>

          <label className="flex items-center gap-4 py-6 md:pl-8">
            <span className="eyebrow whitespace-nowrap">Sort</span>
            <select
              value={initialSort}
              onChange={(e) => setParam("sort", e.target.value)}
              aria-label="Sort plots"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm uppercase tracking-[0.18em] text-charcoal focus:outline-none focus:ring-0"
            >
              <option value="">Newest first</option>
              <option value="size-asc">Size — small to large</option>
              <option value="size-desc">Size — large to small</option>
              <option value="price-asc">Price — low to high</option>
              <option value="price-desc">Price — high to low</option>
            </select>
          </label>
        </div>

        {isFiltered && (
          <div className="flex justify-end pb-6 md:pb-4">
            <button
              type="button"
              onClick={() =>
                startTransition(() => router.push("/plots", { scroll: false }))
              }
              className="link-underline flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted"
            >
              <X size={12} />
              Clear filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
