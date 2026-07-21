"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Loader2, X } from "lucide-react";

interface FilterDef {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * Search + filter bar shared by every admin list. URL-driven, so the server
 * component above it can do the querying and the state survives a refresh.
 */
export default function SearchBar({
  placeholder = "Search",
  filters = [],
  total,
}: {
  placeholder?: string;
  filters?: FilterDef[];
  total?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(currentQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(next: URLSearchParams) {
    next.delete("page"); // A new filter must land on page 1, not page 7 of nothing.
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  }

  useEffect(() => {
    if (query === currentQuery) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam("q", query.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const activeFilters = filters.filter((f) => searchParams.get(f.name));
  const isFiltered = Boolean(currentQuery) || activeFilters.length > 0;

  return (
    <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
        <label className="flex flex-1 items-center gap-3 border-b border-charcoal/25 py-2 focus-within:border-charcoal sm:max-w-xs">
          {isPending ? (
            <Loader2 size={15} className="shrink-0 animate-spin text-muted" />
          ) : (
            <Search size={15} className="shrink-0 text-muted" />
          )}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full min-w-0 border-0 bg-transparent p-0 text-admin-body text-charcoal placeholder:text-muted/70 focus:outline-none focus:ring-0"
          />
        </label>

        {filters.map((filter) => (
          <label key={filter.name} className="flex items-center gap-3">
            <span className="label-admin whitespace-nowrap">{filter.label}</span>
            <select
              value={searchParams.get(filter.name) ?? ""}
              onChange={(event) => setParam(filter.name, event.target.value)}
              aria-label={filter.label}
              className="border-0 border-b border-charcoal/25 bg-transparent py-2 pl-0 pr-6 text-admin-body text-charcoal focus:border-charcoal focus:outline-none focus:ring-0"
            >
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-5">
        {typeof total === "number" && (
          <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.28em] text-muted">
            {total} result{total === 1 ? "" : "s"}
          </span>
        )}
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              startTransition(() => router.push(pathname, { scroll: false }));
            }}
            className="link-underline flex items-center gap-1.5 whitespace-nowrap text-[10px] uppercase tracking-[0.28em] text-muted"
          >
            <X size={11} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
