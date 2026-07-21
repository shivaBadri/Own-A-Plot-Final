/**
 * The dashboard is a card grid, not a table, so the generic group skeleton
 * would flash the wrong shape and cause a visible reflow when the real page
 * lands. This one traces the actual layout.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-fadeIn" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard</span>

      <header className="border-b border-charcoal/10 pb-8">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton mt-4 h-9 w-56" />
        <div className="skeleton mt-4 h-4 w-96 max-w-full" />
      </header>

      <div className="mt-10 grid grid-cols-1 gap-px border border-charcoal/10 bg-charcoal/10 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-cream p-8">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-5 h-12 w-20" />
            <div className="skeleton mt-5 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        <section className="lg:col-span-7">
          <div className="border-b border-charcoal/20 pb-3">
            <div className="skeleton h-6 w-48" />
          </div>
          <div className="mt-5 space-y-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-12 w-full" />
            ))}
          </div>
        </section>

        <section className="lg:col-span-5">
          <div className="border-b border-charcoal/20 pb-3">
            <div className="skeleton h-6 w-52" />
          </div>
          <div className="mt-5 space-y-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-10 w-full" />
            ))}
          </div>
          <div className="mt-10 flex gap-3">
            <div className="skeleton h-11 w-36" />
            <div className="skeleton h-11 w-32" />
          </div>
        </section>
      </div>
    </div>
  );
}
