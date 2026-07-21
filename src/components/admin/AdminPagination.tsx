"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function AdminPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function go(target: number) {
    const next = new URLSearchParams(searchParams.toString());
    if (target > 1) next.set("page", String(target));
    else next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between gap-6"
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="btn-admin-ghost disabled:opacity-30"
      >
        ← Previous
      </button>

      <span className="text-[10px] uppercase tracking-[0.28em] text-muted">
        Page {String(page).padStart(2, "0")} of{" "}
        {String(totalPages).padStart(2, "0")}
      </span>

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="btn-admin-ghost disabled:opacity-30"
      >
        Next →
      </button>
    </nav>
  );
}
