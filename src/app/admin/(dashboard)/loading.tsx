/**
 * The single biggest cause of the "admin takes 2–3 seconds to change page"
 * report.
 *
 * Every admin route is `force-dynamic`, so a navigation cannot be served from
 * a prerender — the browser must wait for the server round trip. Without a
 * `loading.tsx` there is no Suspense boundary for that segment, so Next has
 * nothing to swap in: the OLD page stays on screen, frozen, for the entire
 * request. To the person clicking, the app looks broken rather than busy.
 *
 * With this file in place the shell repaints on the same frame as the click,
 * and `<Link>` prefetch now has a loading state it can warm ahead of time.
 * The server work did not get faster; the perceived latency went to zero.
 */
export default function AdminLoading() {
  return (
    <div className="animate-fadeIn" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      {/* PageHeader */}
      <header className="flex flex-col gap-6 border-b border-charcoal/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-4 h-9 w-64 max-w-full" />
          <div className="skeleton mt-4 h-4 w-80 max-w-full" />
        </div>
        <div className="skeleton h-11 w-40 shrink-0" />
      </header>

      {/* Filter bar */}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <div className="skeleton h-11 w-full max-w-sm" />
        <div className="skeleton h-11 w-36" />
        <div className="skeleton h-11 w-36" />
      </div>

      {/* Table body */}
      <div className="mt-10 space-y-px">
        <div className="skeleton h-8 w-full" />
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="skeleton h-16 w-full"
            style={{ opacity: 1 - index * 0.09 }}
          />
        ))}
      </div>
    </div>
  );
}
