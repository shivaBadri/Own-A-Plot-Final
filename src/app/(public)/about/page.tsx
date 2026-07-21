import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getCmsSection } from "@/lib/cms";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [cms, settings] = await Promise.all([
    getCmsSection("aboutPage"),
    getSettings(),
  ]);
  return {
    title: "About",
    description: cms.intro || settings.defaultSeoDescription,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const cms = await getCmsSection("aboutPage");

  return (
    <>
      {/* Header */}
      <section className="pt-40 md:pt-48">
        <div className="container-page">
          <p className="eyebrow animate-fadeIn">{cms.eyebrow}</p>
          <h1 className="mt-6 max-w-4xl animate-fadeUp font-serif text-h1 leading-[1.05]">
            {cms.title}
          </h1>
          <p className="prose-max mt-8 animate-fadeUp text-body text-muted [animation-delay:120ms]">
            {cms.intro}
          </p>
        </div>
      </section>

      {/* Split editorial */}
      <section className="section-y">
        <div className="container-page grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">
          <div
            data-reveal
            className="relative aspect-[4/5] w-full overflow-hidden lg:col-span-6"
          >
            <Image
              src={cms.splitImage}
              alt=""
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          <div data-reveal className="lg:col-span-6 lg:pt-20">
            <p className="eyebrow">{cms.splitEyebrow}</p>
            <h2 className="mt-6 font-serif text-h2">{cms.splitTitle}</h2>
            <div className="prose-max mt-10 space-y-6 text-body text-muted">
              {cms.splitBody.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="section-y border-t border-charcoal/10">
        <div className="container-page">
          <div data-reveal className="max-w-2xl">
            <p className="eyebrow">{cms.principlesEyebrow}</p>
            <h2 className="mt-6 font-serif text-h2">{cms.principlesTitle}</h2>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-16 md:grid-cols-2 lg:gap-24">
            {cms.principles.map((principle, index) => (
              <div key={`${principle.n}-${index}`} data-reveal className="group">
                <p className="font-serif text-h2 text-charcoal/20">
                  {principle.n}
                </p>
                <h3 className="mt-6 font-serif text-h3">{principle.title}</h3>
                <p className="prose-max mt-6 text-body text-muted">
                  {principle.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing quote + CTA */}
      <section className="section-y border-t border-charcoal/10">
        <div className="container-page grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
          <div data-reveal className="lg:col-span-7">
            <blockquote className="font-serif text-h2 leading-[1.25]">
              &ldquo;{cms.quote}&rdquo;
            </blockquote>
            <p className="mt-8 text-sm uppercase tracking-[0.24em] text-muted">
              {cms.quoteAttribution}
            </p>

            <Link href="/ventures" className="btn-luxury group mt-12">
              {cms.ctaLabel}
              <ArrowRight
                size={16}
                className="transition-transform duration-500 group-hover:translate-x-1"
              />
            </Link>
          </div>

          <div
            data-reveal
            className="relative aspect-[4/5] w-full overflow-hidden lg:col-span-5"
          >
            <Image
              src={cms.quoteImage}
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
