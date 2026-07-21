import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  Sprout,
  MessageCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCms, type WhyIcon } from "@/lib/cms";
import { toVentures, isOpen } from "@/lib/content";

export const dynamic = "force-dynamic";

const ICONS: Record<WhyIcon, LucideIcon> = {
  shield: ShieldCheck,
  file: FileText,
  sprout: Sprout,
  message: MessageCircle,
};

/**
 * Hover tints for the "Why" cards. Keyed by icon rather than array position, so
 * the tint stays paired with its card even if an admin reorders them in the CMS.
 */
const WHY_TONES: Record<WhyIcon, { fill: string; icon: string; title: string }> =
  {
    shield: {
      fill: "hover:bg-olive/10",
      icon: "group-hover:text-olive",
      title: "group-hover:text-olive",
    },
    file: {
      fill: "hover:bg-sand/40",
      icon: "group-hover:text-bark",
      title: "group-hover:text-bark",
    },
    sprout: {
      fill: "hover:bg-earth/20",
      icon: "group-hover:text-earth",
      title: "group-hover:text-earth",
    },
    message: {
      fill: "hover:bg-bark/10",
      icon: "group-hover:text-bark",
      title: "group-hover:text-bark",
    },
  };

export default async function HomePage() {
  const [cms, featuredProjects, newestProjects] = await Promise.all([
    getCms(),
    prisma.project.findMany({
      where: { isPublished: true, featured: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.project.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 3,
    }),
  ]);

  // If nothing is marked "featured" yet, fall back to the newest published
  // ventures. An empty homepage grid is worse than a sensible default.
  const source =
    featuredProjects.length > 0 ? featuredProjects : newestProjects;
  const ventures = toVentures(source);

  const { hero, homeAbout, featured, why, quote } = cms;

  return (
    <>
      {/* HERO */}
      <section className="relative h-[100svh] w-full overflow-hidden">
        <Image
          src={hero.image}
          alt={hero.title}
          fill
          priority
          sizes="100vw"
          className="animate-slowZoom object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/55" />

        <div className="container-page relative flex h-full flex-col items-center justify-center pt-[18vh] text-center">
          <div className="animate-fadeUp text-cream">
            <h1 className="font-serif text-hero leading-none tracking-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
              {hero.title}
            </h1>

            <div className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <Link href={hero.primaryHref} className="btn-hero-primary group">
                {hero.primaryLabel}
                <ArrowRight
                  size={16}
                  className="transition-transform duration-500 group-hover:translate-x-1"
                />
              </Link>
              <Link
                href={hero.secondaryHref}
                className="btn-hero-secondary group"
              >
                {hero.secondaryLabel}
                <ArrowRight
                  size={16}
                  className="transition-transform duration-500 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT — editorial split */}
      <section className="section-y bg-cream">
        <div className="container-page grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">
          <div
            data-reveal
            className="relative aspect-[4/5] w-full overflow-hidden lg:col-span-6"
          >
            <Image
              src={homeAbout.image}
              alt=""
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          <div data-reveal className="lg:col-span-6 lg:pt-24">
            <p className="eyebrow">{homeAbout.eyebrow}</p>
            <h2 className="mt-6 font-serif text-h2">{homeAbout.title}</h2>
            <div className="mt-10 flex items-center gap-4">
              <span className="rule" />
            </div>
            <div className="prose-max mt-10 space-y-6 text-body text-muted">
              {homeAbout.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>

            <Link href={homeAbout.ctaHref} className="btn-luxury group mt-12">
              {homeAbout.ctaLabel}
              <ArrowRight
                size={16}
                className="transition-transform duration-500 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED VENTURES */}
      <section className="section-y border-t border-charcoal/10 bg-cream">
        <div className="container-page">
          <div
            data-reveal
            className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end"
          >
            <div className="max-w-xl">
              <p className="eyebrow">{featured.eyebrow}</p>
              <h2 className="mt-6 font-serif text-h2">{featured.title}</h2>
            </div>
            <Link
              href="/ventures"
              className="link-underline text-sm uppercase tracking-[0.22em]"
            >
              {featured.linkLabel}
            </Link>
          </div>

          {ventures.length === 0 ? (
            <p
              data-reveal
              className="mt-20 border border-charcoal/10 bg-sand/20 px-8 py-16 text-center text-body text-muted"
            >
              The first ventures are being drawn. Nothing is open for preview
              just yet.
            </p>
          ) : (
            <div className="mt-20 grid grid-cols-1 gap-16 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {ventures.map((v, idx) => {
                const open = isOpen(v);
                return (
                  <Link
                    key={v.slug}
                    href={`/ventures/${v.slug}`}
                    data-reveal
                    className={`group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-charcoal ${
                      idx === 0 ? "md:col-span-2 lg:col-span-1" : ""
                    }`}
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden">
                      <Image
                        src={v.heroImage}
                        alt={v.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                      <div className="absolute left-6 top-6 flex items-center gap-2 border border-cream/60 bg-black/25 px-3 py-1.5 backdrop-blur-sm">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            open ? "bg-olive" : "bg-cream/70"
                          }`}
                        />
                        <p className="text-[10px] uppercase tracking-[0.28em] text-cream">
                          {open ? "Now open" : "Coming soon"}
                        </p>
                      </div>

                      <div className="absolute inset-x-6 bottom-6 flex items-end justify-between text-cream">
                        <h3 className="font-serif text-h3 leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                          {v.name}
                        </h3>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-cream/80 bg-black/25 backdrop-blur-sm transition-all duration-500 group-hover:bg-cream group-hover:text-charcoal">
                          <ArrowRight size={16} />
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-baseline justify-between gap-4">
                      <p className="text-sm uppercase tracking-[0.22em] text-charcoal/80">
                        {v.location}
                      </p>
                      <span className="link-underline text-[11px] uppercase tracking-[0.28em] text-charcoal">
                        View Venture
                      </span>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-charcoal/15 pt-6 text-sm text-charcoal/85">
                      <span className="font-serif text-lg">
                        {v.totalAcres ?? "—"}
                        <span className="ml-1 text-xs uppercase tracking-[0.22em] text-muted">
                          acres
                        </span>
                      </span>
                      <span className="h-1 w-1 rounded-full bg-charcoal/30" />
                      <span
                        className={`text-xs uppercase tracking-[0.22em] ${
                          open ? "text-olive" : "text-muted"
                        }`}
                      >
                        {open ? "Enquire" : "Preview"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="section-y border-t border-charcoal/10 bg-cream">
        <div className="container-page">
          <div data-reveal className="max-w-2xl">
            <p className="eyebrow">{why.eyebrow}</p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {why.items.map((item, index) => {
              const Icon = ICONS[item.icon] ?? ShieldCheck;
              const tone = WHY_TONES[item.icon] ?? WHY_TONES.shield;
              return (
                <div
                  key={`${item.title}-${index}`}
                  data-reveal
                  className={`group border border-charcoal/10 p-10 transition-colors duration-700 ${tone.fill}`}
                >
                  <Icon
                    size={40}
                    strokeWidth={1}
                    className={`text-muted/70 transition-colors duration-700 ${tone.icon}`}
                  />
                  <h3
                    className={`mt-8 font-serif text-h4 transition-colors duration-700 ${tone.title}`}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-4 text-body text-muted">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CLOSING QUOTE */}
      <section className="section-y border-t border-charcoal/10 bg-cream">
        <div className="container-page grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
          <div data-reveal className="lg:col-span-7">
            <p className="eyebrow">{quote.eyebrow}</p>
            <blockquote className="mt-8 font-serif text-h2 leading-[1.25]">
              &ldquo;{quote.quote}&rdquo;
            </blockquote>
            <p className="mt-8 text-sm uppercase tracking-[0.24em] text-muted">
              {quote.attribution}
            </p>
          </div>

          <div
            data-reveal
            className="relative aspect-[4/5] w-full overflow-hidden lg:col-span-5"
          >
            <Image
              src={quote.image}
              alt=""
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </>
  );
}
