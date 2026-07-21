"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X, Loader2 } from "lucide-react";

/**
 * The approved design shipped this row with the comment "Filters (visual —
 * non-functional)". These are the same three cells, in the same divided-grid
 * geometry, now driving real server-side queries via the URL.
 *
 * URL-as-state, deliberately: filtered listings stay linkable, shareable, and
 * back-button-correct, and the page remains a server component.
 */
export default function VentureFilters({
  locations,
  resultCount,
  totalCount,
  initialQuery,
  initialLocation,
  initialStatus,
}: {
  locations: string[];
  resultCount: number;
  totalCount: number;
  initialQuery: string;
  initialLocation: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(next: URLSearchParams) {
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/ventures?${qs}` : "/ventures", { scroll: false });
    });
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  }

  // Debounced free-text search — one request per pause, not one per keystroke.
  useEffect(() => {
    if (query === initialQuery) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam("q", query.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // `setParam` is stable enough for this effect's purpose; re-running it on
    // every searchParams change would fight the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const isFiltered = Boolean(initialQuery || initialLocation || initialStatus);

  return (
    <section className="mt-20 border-y border-charcoal/10">
      <div className="container-page">
        <div className="grid grid-cols-1 divide-y divide-charcoal/10 md:grid-cols-4 md:divide-x md:divide-y-0">
          <div className="flex items-center justify-between gap-4 py-6 md:pr-8">
            <span className="eyebrow">Filter</span>
            <span className="flex items-center gap-2 whitespace-nowrap text-xs uppercase tracking-[0.24em] text-muted">
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isFiltered
                ? `${resultCount} of ${totalCount}`
                : `${totalCount} Places`}
            </span>
          </div>

          <label className="group flex items-center gap-3 py-6 md:px-8">
            <Search size={15} className="shrink-0 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="SEARCH"
              aria-label="Search ventures"
              className="w-full min-w-0 border-0 bg-transparent p-0 text-sm uppercase tracking-[0.18em] text-charcoal placeholder:text-muted focus:outline-none focus:ring-0"
            />
          </label>

          <label className="group flex items-center gap-4 py-6 md:px-8">
            <span className="eyebrow whitespace-nowrap">Location</span>
            <select
              value={initialLocation}
              onChange={(event) => setParam("location", event.target.value)}
              aria-label="Filter by location"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm uppercase tracking-[0.18em] text-charcoal focus:outline-none focus:ring-0"
            >
              <option value="">All corridors</option>
              {locations.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="group flex items-center gap-4 py-6 md:pl-8">
            <span className="eyebrow whitespace-nowrap">Status</span>
            <select
              value={initialStatus}
              onChange={(event) => setParam("status", event.target.value)}
              aria-label="Filter by status"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm uppercase tracking-[0.18em] text-charcoal focus:outline-none focus:ring-0"
            >
              <option value="">Any status</option>
              <option value="ONGOING">Now open</option>
              <option value="UPCOMING">Coming soon</option>
              <option value="COMPLETED">Fully subscribed</option>
            </select>
          </label>
        </div>

        {isFiltered && (
          <div className="flex justify-end pb-6 md:pb-4">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                startTransition(() => router.push("/ventures", { scroll: false }));
              }}
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
