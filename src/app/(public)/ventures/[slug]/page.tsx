import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Download, MapPin, ArrowRight } from "lucide-react";
import { getPublishedProjectBySlug } from "@/lib/cache";
import { getSettings } from "@/lib/settings";
import { toVenture, isOpen } from "@/lib/content";
import { formatPriceShort, formatSqft } from "@/lib/format";
import EnquiryForm from "@/components/public/EnquiryForm";
import LocationAdvantages from "@/components/public/LocationAdvantages";
import MasterLayout from "@/components/public/MasterLayout";
import { parsePoints, type LayoutView, type PlotStatus } from "@/lib/layout";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Only published ventures are reachable. An unpublished slug 404s rather than
 * rendering — a draft must never be linkable by guessing the URL.
 *
 * Wrapped in React `cache()` so that `generateMetadata` and the page component
 * share ONE query per request. Previously each page view ran this include —
 * which pulls every plot on the venture — twice.
 */
const getProject = getPublishedProjectBySlug;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Venture not found" };

  const venture = toVenture(project);
  const settings = await getSettings();

  return {
    title: venture.seoTitle ?? venture.name,
    description: venture.seoDescription ?? venture.tagline,
    alternates: { canonical: `/ventures/${venture.slug}` },
    openGraph: {
      title: venture.seoTitle ?? `${venture.name} — ${settings.siteName}`,
      description: venture.seoDescription ?? venture.tagline,
      images: venture.heroImage ? [{ url: venture.heroImage }] : undefined,
      type: "article",
    },
  };
}

export default async function VenturePage({ params }: Props) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const venture = toVenture(project);
  const settings = await getSettings();
  const availablePlots = project.plots.filter((p) => p.status === "AVAILABLE");

  /**
   * Prisma hands back `points` as `JsonValue`. It is parsed and clamped here,
   * on the server, so the client component receives real `Point[]` and a bad
   * row written by a future migration degrades to "that polygon is missing"
   * rather than throwing inside a browser render.
   */
  const layoutViews: LayoutView[] = project.layouts.map((layout) => ({
    id: layout.id,
    name: layout.name,
    description: layout.description,
    imageUrl: layout.imageUrl,
    imageWidth: layout.imageWidth,
    imageHeight: layout.imageHeight,
    shapes: layout.shapes
      .map((shape) => ({
        id: shape.id,
        kind: shape.kind,
        label: shape.label,
        points: parsePoints(shape.points),
        plot: shape.plot
          ? { ...shape.plot, status: shape.plot.status as PlotStatus }
          : null,
      }))
      .filter((shape) => shape.points.length >= 3),
  }));
  const hasLayout = layoutViews.some((layout) => layout.shapes.length > 0);
  /** The plan shown as a preview in the brochure card and framed by the viewer. */
  const previewLayout =
    layoutViews.find((layout) => layout.shapes.length > 0) ?? layoutViews[0];
  const showInteractiveLayout = hasLayout && settings.features.interactiveLayout;
  const hasStory =
    venture.story.body.length > 0 ||
    venture.gallery.length > 0 ||
    venture.amenities.length > 0 ||
    venture.details.length > 0 ||
    venture.landscape.length > 0 ||
    venture.advantages.length > 0;

  return (
    <>
      {/* ENTRANCE — HERO */}
      <section className="relative h-[100svh] w-full overflow-hidden">
        {venture.heroVideo ? (
          <video
            src={venture.heroVideo}
            poster={venture.heroImage}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image
            src={venture.heroImage}
            alt={venture.name}
            fill
            priority
            sizes="100vw"
            className="animate-slowZoom object-cover"
          />
        )}
        {/* Layered darkening — flat base + bottom-anchored gradient for the
            text column + left vignette. Guarantees legibility over any hero
            image, regardless of how bright the source is. */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />

        <div className="container-page relative flex h-full flex-col justify-end pb-20 md:pb-28">
          <div className="animate-fadeUp text-cream [text-shadow:0_2px_18px_rgba(0,0,0,0.55)]">
            <div className="flex items-center gap-4">
              <span className="block h-px w-12 bg-cream/70" />
              <p className="text-[11px] uppercase tracking-[0.32em] text-cream">
                Ventures / {venture.location}
              </p>
            </div>

            <h1 className="mt-8 max-w-4xl font-serif text-hero leading-[1.05] drop-shadow-[0_4px_28px_rgba(0,0,0,0.6)]">
              {venture.name}
            </h1>
            <p className="mt-6 max-w-xl text-body text-cream/95">
              {venture.tagline}
            </p>

            <div className="mt-12 flex flex-wrap items-center gap-x-12 gap-y-6 border-t border-cream/30 pt-8">
              {venture.totalAcres !== null && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-cream/80">
                    Extent
                  </p>
                  <p className="mt-1 font-serif text-h4">
                    {venture.totalAcres} acres
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-cream/80">
                  Region
                </p>
                <p className="mt-1 max-w-sm text-body">{venture.region}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-cream/80">
                  Corridor
                </p>
                <p className="mt-1 font-serif text-h4">{venture.location}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-cream/80">
                  Status
                </p>
                <p className="mt-1 font-serif text-h4">
                  {isOpen(venture) ? "Now open" : "Coming soon"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAP + BROCHURE */}
      <section className="section-y bg-cream">
        <div className="container-page">
          <div data-reveal className="max-w-2xl">
            <p className="eyebrow">Orient Yourself</p>
            <h2 className="mt-6 font-serif text-h2">
              Find the land on the map. Take the layout with you.
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div data-reveal className="lg:col-span-7">
              <div className="relative aspect-[16/11] w-full overflow-hidden border border-charcoal/10">
                {venture.locationInfo.mapEmbed ? (
                  <iframe
                    src={venture.locationInfo.mapEmbed}
                    title={`${venture.name} location`}
                    className="absolute inset-0 h-full w-full grayscale-[0.35] transition-all duration-700 hover:grayscale-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-sand/40">
                    <p className="text-sm uppercase tracking-[0.24em] text-muted">
                      Map available on private preview
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-start gap-3 text-sm text-muted">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <p>{venture.locationInfo.address}</p>
              </div>
            </div>

            <div data-reveal className="lg:col-span-5">
              <div className="flex h-full flex-col justify-between border border-charcoal/10 bg-sand/20 p-10">
                <div>
                  <p className="eyebrow">The Brochure</p>
                  <h3 className="mt-6 font-serif text-h3">
                    The full story, in paper form.
                  </h3>
                  <p className="prose-max mt-6 text-body text-muted">
                    {venture.brochure
                      ? `A carefully printed brochure of ${venture.name} — masterplan, photography, and legal notes. Take it home, read it slowly.`
                      : `The brochure for ${venture.name} is at the printers. Leave your details and we will send it the day it is ready.`}
                  </p>
                </div>

                <div className="mt-12 border-t border-charcoal/15 pt-6">
                  {/* Master layout preview — sits inside the brochure card,
                      above the download, per the approved arrangement. Links
                      down to the full interactive plan. */}
                  {showInteractiveLayout &&
                    settings.features.brochureLayoutPreview &&
                    previewLayout && (
                      <a
                        href="#master-layout"
                        className="group mb-6 block"
                        aria-label="View the interactive master layout"
                      >
                        <span className="relative block aspect-[16/10] w-full overflow-hidden border border-charcoal/10 bg-cream">
                          <Image
                            src={previewLayout.imageUrl}
                            alt={`${venture.name} master layout preview`}
                            fill
                            sizes="(min-width: 1024px) 30vw, 90vw"
                            className="object-contain transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        </span>
                        <span className="mt-3 flex items-center justify-between gap-3">
                          <span className="eyebrow">Master Layout</span>
                          <span className="link-underline flex items-center gap-2 text-[11px] uppercase tracking-[0.22em]">
                            Explore the plan
                            <ArrowRight
                              size={13}
                              className="transition-transform duration-500 group-hover:translate-x-1"
                            />
                          </span>
                        </span>
                      </a>
                    )}

                  {venture.brochure ? (
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <p className="truncate font-serif text-lg">
                          {venture.brochure.fileName}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted">
                          PDF · {venture.brochure.fileSize}
                        </p>
                      </div>
                      <a
                        href={venture.brochure.url}
                        download
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Download the ${venture.name} brochure`}
                        className="group flex h-14 w-14 shrink-0 items-center justify-center border border-charcoal transition-all duration-500 hover:bg-charcoal hover:text-cream"
                      >
                        <Download
                          size={18}
                          className="transition-transform duration-500 group-hover:translate-y-0.5"
                        />
                      </a>
                    </div>
                  ) : (
                    <Link href="/contact" className="btn-luxury w-full">
                      Request the Brochure
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STORY, GALLERY, AMENITIES, DETAILS, LANDSCAPE, ADVANTAGES */}
      {hasStory && (
        <section className="section-y border-t border-charcoal/10 bg-cream">
          <div className="container-page">
            {(venture.story.title || venture.story.body.length > 0) && (
              <div data-reveal className="max-w-2xl">
                <p className="eyebrow">{venture.story.eyebrow}</p>
                {venture.story.title && (
                  <h2 className="mt-6 font-serif text-h2">
                    {venture.story.title}
                  </h2>
                )}
                <div className="prose-max mt-10 space-y-6 text-body text-muted">
                  {venture.story.body.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {venture.gallery.length > 1 && (
              <div className="mt-24 grid grid-cols-1 gap-12 md:grid-cols-12">
                <div
                  data-reveal
                  className="relative aspect-[4/5] w-full overflow-hidden md:col-span-7"
                >
                  <Image
                    src={venture.gallery[0]}
                    alt={`${venture.name} — the land`}
                    fill
                    sizes="(min-width: 768px) 60vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-end gap-12 md:col-span-5 md:pb-12">
                  <div
                    data-reveal
                    className="relative aspect-[4/3] w-full overflow-hidden"
                  >
                    <Image
                      src={venture.gallery[1]}
                      alt={`${venture.name} — the land`}
                      fill
                      sizes="(min-width: 768px) 40vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div data-reveal>
                    <p className="eyebrow">A note from the site</p>
                    <p className="mt-4 font-serif text-h4 leading-snug">
                      &ldquo;There is a stillness on this land at seven in the
                      morning that no drone photograph will ever hold.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Remaining gallery images — the reference build silently dropped
                everything past the second image. */}
            {venture.gallery.length > 2 && (
              <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                {venture.gallery.slice(2).map((src, index) => (
                  <div
                    key={`${src}-${index}`}
                    data-reveal
                    className="relative aspect-[4/5] w-full overflow-hidden"
                  >
                    <Image
                      src={src}
                      alt={`${venture.name} — gallery image ${index + 3}`}
                      fill
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-cover transition-transform duration-700 hover:scale-[1.04]"
                    />
                  </div>
                ))}
              </div>
            )}

            {(venture.amenities.length > 0 || venture.details.length > 0) && (
              <div className="mt-32 grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">
                {venture.amenities.length > 0 && (
                  <div data-reveal className="lg:col-span-7">
                    <p className="eyebrow">Amenities</p>
                    <h3 className="mt-6 font-serif text-h3">
                      A quiet set of comforts, done properly.
                    </h3>
                    <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-5 border-t border-charcoal/10 pt-8 sm:grid-cols-2">
                      {venture.amenities.map((amenity) => (
                        <li
                          key={amenity}
                          className="flex items-start gap-3 text-body"
                        >
                          <span className="mt-3 block h-px w-4 bg-charcoal/40" />
                          <span>{amenity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {venture.details.length > 0 && (
                  <div data-reveal className="lg:col-span-5">
                    <p className="eyebrow">The Layout, in Numbers</p>
                    <dl className="mt-10 divide-y divide-charcoal/10 border-y border-charcoal/10">
                      {venture.details.map((detail) => (
                        <div
                          key={detail.label}
                          className="flex items-baseline justify-between gap-6 py-5"
                        >
                          <dt className="text-sm uppercase tracking-[0.22em] text-muted">
                            {detail.label}
                          </dt>
                          <dd className="text-right font-serif text-lg">
                            {detail.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}

            {venture.landscape.length > 0 && (
              <div className="mt-32 space-y-24 md:space-y-32">
                {venture.landscape.map((row, idx) => (
                  <article
                    key={`${row.title}-${idx}`}
                    data-reveal
                    className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-24"
                  >
                    {row.image && (
                      <div
                        className={`relative aspect-[4/5] w-full overflow-hidden lg:col-span-7 ${
                          idx % 2 === 1 ? "lg:order-2" : ""
                        }`}
                      >
                        <Image
                          src={row.image}
                          alt={row.title}
                          fill
                          sizes="(min-width: 1024px) 60vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div
                      className={`lg:col-span-5 ${
                        idx % 2 === 1 ? "lg:order-1" : ""
                      }`}
                    >
                      <p className="eyebrow">
                        {String(idx + 1).padStart(2, "0")} /{" "}
                        {String(venture.landscape.length).padStart(2, "0")}
                      </p>
                      <h3 className="mt-6 font-serif text-h3">{row.title}</h3>
                      <p className="prose-max mt-8 text-body text-muted">
                        {row.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {venture.advantages.length > 0 && (
              <div data-reveal className="mt-32">
                <LocationAdvantages
                  advantages={venture.advantages}
                  accent={venture.accent}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* MASTER LAYOUT — sits between Amenities and Location, as specified.
          Rendered only when a published plan with at least one boundary
          exists, so a venture without one keeps the original page rhythm
          rather than showing an empty frame. */}
      {showInteractiveLayout && (
        <section
          id="master-layout"
          className="section-y border-t border-charcoal/10 bg-cream"
        >
          <div className="container-page">
            <div data-reveal className="max-w-2xl">
              <p className="eyebrow">Master Layout</p>
              <h2 className="mt-5 font-serif text-h2 leading-tight">
                Find your plot on the plan.
              </h2>
              <p className="mt-6 text-body text-muted">
                Every boundary below is a real plot. Tap one to see its extent,
                dimensions, facing and price — and what is still open.
              </p>
            </div>

            <div data-reveal className="mt-14">
              <MasterLayout
                layouts={layoutViews}
                features={{
                  plotSearch: settings.features.plotSearch,
                  autoZoom: settings.features.layoutAutoZoom,
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* AVAILABLE PLOTS — the reference design had no plots section because it
          had no plots data. The schema does, so they are surfaced here in the
          same editorial language rather than left unreachable. */}
      {availablePlots.length > 0 && (
        <section className="section-y border-t border-charcoal/10 bg-cream">
          <div className="container-page">
            <div
              data-reveal
              className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end"
            >
              <div className="max-w-2xl">
                <p className="eyebrow">Available Plots</p>
                <h2 className="mt-6 font-serif text-h2">
                  {availablePlots.length} plot
                  {availablePlots.length === 1 ? "" : "s"} still open at{" "}
                  {venture.name}.
                </h2>
              </div>
              <Link
                href="/plots"
                className="link-underline text-sm uppercase tracking-[0.22em]"
              >
                All Plots →
              </Link>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-px border border-charcoal/10 bg-charcoal/10 sm:grid-cols-2 lg:grid-cols-3">
              {availablePlots.map((plot) => (
                <Link
                  key={plot.id}
                  href={`/plots/${plot.id}`}
                  data-reveal
                  className="group flex flex-col justify-between gap-8 bg-cream p-8 transition-colors duration-500 hover:bg-sand/30 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-charcoal"
                >
                  <div>
                    <p className="eyebrow">Plot</p>
                    <p className="mt-3 font-serif text-h3">{plot.plotNumber}</p>
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
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LOCATION */}
      <section className="section-y border-t border-charcoal/10 bg-cream">
        <div className="container-page">
          <div data-reveal className="max-w-2xl">
            <p className="eyebrow">Location</p>
            <h2 className="mt-6 font-serif text-h2">
              A quiet corner of a growing corridor.
            </h2>
            <p className="prose-max mt-6 text-body text-muted">
              {venture.locationInfo.address}
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div
              data-reveal
              className="relative aspect-[4/3] w-full overflow-hidden border border-charcoal/10 lg:col-span-7"
            >
              {venture.locationInfo.mapEmbed ? (
                <iframe
                  src={venture.locationInfo.mapEmbed}
                  title={`${venture.name} area map`}
                  className="absolute inset-0 h-full w-full grayscale-[0.4]"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-sand/40">
                  <p className="text-sm uppercase tracking-[0.24em] text-muted">
                    Map on private preview
                  </p>
                </div>
              )}
            </div>

            <div data-reveal className="lg:col-span-5">
              <p className="eyebrow">Reachable From</p>
              <ul className="mt-8 divide-y divide-charcoal/10 border-y border-charcoal/10">
                {venture.locationInfo.nearby.length > 0 ? (
                  venture.locationInfo.nearby.map((n) => (
                    <li
                      key={n.name}
                      className="flex items-baseline justify-between gap-6 py-5"
                    >
                      <span className="text-body">{n.name}</span>
                      <span className="whitespace-nowrap text-sm uppercase tracking-[0.22em] text-muted">
                        {n.distance}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="py-5 text-body text-muted">
                    Precise distances shared on private preview.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ENQUIRY */}
      <section className="section-y border-t border-charcoal/10 bg-cream">
        <div className="container-page grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">
          <div data-reveal className="lg:col-span-5">
            <p className="eyebrow">Take the Next Step</p>
            <h2 className="mt-6 font-serif text-h2">
              A walk of the land, at your pace.
            </h2>
            <p className="prose-max mt-8 text-body text-muted">
              Share your details. We&rsquo;ll arrange a private visit at a time
              of your choosing, with no pressure and no hurry.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <span className="rule" />
              <p className="eyebrow">We call back within one working day.</p>
            </div>

            <Link
              href="/ventures"
              className="link-underline mt-16 inline-block text-sm uppercase tracking-[0.22em]"
            >
              ← Back to all Ventures
            </Link>
          </div>

          <div className="lg:col-span-7">
            <EnquiryForm
              ventureName={venture.name}
              projectId={venture.id}
              source={`/ventures/${venture.slug}`}
            />
          </div>
        </div>
      </section>

      {/* Bottom nav */}
      <section className="border-t border-charcoal/10">
        <div className="container-page flex items-center justify-between gap-6 py-10">
          <p className="text-sm uppercase tracking-[0.22em] text-muted">
            {venture.name}
          </p>
          <Link
            href="/ventures"
            className="link-underline flex items-center gap-2 whitespace-nowrap text-sm uppercase tracking-[0.22em]"
          >
            Other Ventures
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}
