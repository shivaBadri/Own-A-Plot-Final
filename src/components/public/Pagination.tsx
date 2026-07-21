import Link from "next/link";

/**
 * Pagination in the site's own language — hairline rules, uppercase tracking,
 * no rounded pills. Renders nothing when there is only one page.
 */
export default function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Pagination"
      className="mt-24 flex items-center justify-between gap-6 border-t border-charcoal/10 pt-8"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="link-underline text-xs uppercase tracking-[0.28em]"
        >
          ← Previous
        </Link>
      ) : (
        <span className="text-xs uppercase tracking-[0.28em] text-muted/40">
          ← Previous
        </span>
      )}

      <ul className="flex items-center gap-5">
        {pages.map((n) => (
          <li key={n}>
            <Link
              href={href(n)}
              aria-current={n === page ? "page" : undefined}
              className={`text-xs uppercase tracking-[0.28em] transition-colors duration-500 ${
                n === page
                  ? "border-b border-charcoal pb-1 text-charcoal"
                  : "text-muted hover:text-charcoal"
              }`}
            >
              {String(n).padStart(2, "0")}
            </Link>
          </li>
        ))}
      </ul>

      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="link-underline text-xs uppercase tracking-[0.28em]"
        >
          Next →
        </Link>
      ) : (
        <span className="text-xs uppercase tracking-[0.28em] text-muted/40">
          Next →
        </span>
      )}
    </nav>
  );
}
