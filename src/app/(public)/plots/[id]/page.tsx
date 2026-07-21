import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { toVenture } from "@/lib/content";
import { formatPrice, formatPriceShort, formatSqft } from "@/lib/format";
import EnquiryForm from "@/components/public/EnquiryForm";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

async function getPlot(id: string) {
  return prisma.plot.findFirst({
    where: { id, project: { isPublished: true } },
    include: { project: true, media: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const plot = await getPlot(id);
  if (!plot) return { title: "Plot not found" };

  return {
    title: `Plot ${plot.plotNumber} — ${plot.project.name}`,
    description: `${formatSqft(plot.sizeSqft)} at ${plot.project.name}, ${plot.project.location}. ${formatPriceShort(plot.price, plot.priceOnRequest)}.`,
    alternates: { canonical: `/plots/${plot.id}` },
  };
}

export default async function PlotDetailPage({ params }: Props) {
  const { id } = await params;
  const plot = await getPlot(id);
  if (!plot) notFound();

  const venture = toVenture(plot.project);
  const gallery = plot.media.length > 0 ? plot.media.map((m) => m.url) : venture.gallery;

  const facts = [
    { label: "Extent", value: formatSqft(plot.sizeSqft) },
    plot.facing ? { label: "Facing", value: plot.facing } : null,
    { label: "Status", value: plot.status.charAt(0) + plot.status.slice(1).toLowerCase() },
    {
      label: "Price",
      value: plot.priceOnRequest ? "On enquiry" : formatPrice(plot.price),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      {/* Hero — the venture's land, since a plot is a piece of it. */}
      <section className="relative h-[70svh] w-full overflow-hidden">
        <Image
          src={venture.heroImage}
          alt={venture.name}
          fill
          priority
          sizes="100vw"
          className="animate-slowZoom object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/70" />

        <div className="container-page relative flex h-full flex-col justify-end pb-16 md:pb-20">
          <div className="animate-fadeUp text-cream">
            <div className="flex items-center gap-4">
              <span className="block h-px w-12 bg-cream/60" />
              <Link
                href={`/ventures/${venture.slug}`}
                className="link-underline text-[11px] uppercase tracking-[0.32em] text-cream/85"
              >
                {venture.name}
              </Link>
            </div>

            <h1 className="mt-8 font-serif text-h1 leading-[1.05]">
              Plot {plot.plotNumber}
            </h1>
            <p className="mt-6 max-w-xl text-body text-cream/85">
              {plot.description ?? venture.tagline}
            </p>
          </div>
        </div>
      </section>

      {/* Facts */}
      <section className="border-b border-charcoal/10 bg-cream">
        <div className="container-page">
          <dl className="grid grid-cols-2 divide-charcoal/10 md:grid-cols-4 md:divide-x">
            {facts.map((fact) => (
              <div key={fact.label} className="py-10 md:px-8 md:first:pl-0">
                <dt className="eyebrow">{fact.label}</dt>
                <dd className="mt-3 font-serif text-h3">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="section-y bg-cream">
          <div className="container-page">
            <div data-reveal className="max-w-2xl">
              <p className="eyebrow">The Ground</p>
              <h2 className="mt-6 font-serif text-h2">
                The land this plot sits on.
              </h2>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {gallery.slice(0, 6).map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  data-reveal
                  className="relative aspect-[4/3] w-full overflow-hidden"
                >
                  <Image
                    src={src}
                    alt={`${venture.name} — plot ${plot.plotNumber}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 hover:scale-[1.04]"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Amenities from the parent venture */}
      {venture.amenities.length > 0 && (
        <section className="section-y border-t border-charcoal/10 bg-cream">
          <div className="container-page grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">
            <div data-reveal className="lg:col-span-5">
              <p className="eyebrow">What Comes With It</p>
              <h2 className="mt-6 font-serif text-h2">
                Everything {venture.name} carries.
              </h2>
              <Link
                href={`/ventures/${venture.slug}`}
                className="btn-luxury group mt-12"
              >
                View the Venture
                <ArrowRight
                  size={16}
                  className="transition-transform duration-500 group-hover:translate-x-1"
                />
              </Link>
            </div>

            <div data-reveal className="lg:col-span-7">
              <ul className="grid grid-cols-1 gap-x-8 gap-y-5 border-t border-charcoal/10 pt-8 sm:grid-cols-2">
                {venture.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-start gap-3 text-body">
                    <span className="mt-3 block h-px w-4 bg-charcoal/40" />
                    <span>{amenity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Enquiry */}
      <section className="section-y border-t border-charcoal/10 bg-cream">
        <div className="container-page grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">
          <div data-reveal className="lg:col-span-5">
            <p className="eyebrow">Enquire</p>
            <h2 className="mt-6 font-serif text-h2">
              Ask about plot {plot.plotNumber}.
            </h2>
            <p className="prose-max mt-8 text-body text-muted">
              Share your details and we will call to talk through this plot, its
              orientation, and what the paperwork looks like.
            </p>
            <Link
              href="/plots"
              className="link-underline mt-16 inline-block text-sm uppercase tracking-[0.22em]"
            >
              ← Back to all Plots
            </Link>
          </div>

          <div className="lg:col-span-7">
            <EnquiryForm
              ventureName={`${venture.name} — Plot ${plot.plotNumber}`}
              projectId={plot.projectId}
              plotId={plot.id}
              source={`/plots/${plot.id}`}
            />
          </div>
        </div>
      </section>
    </>
  );
}
