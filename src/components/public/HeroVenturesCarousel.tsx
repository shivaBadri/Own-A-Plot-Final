"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { isOpen, type Venture } from "@/lib/content";

const SLIDE_DURATION_MS = 6500;
const FADE_MS = 1400;

export default function HeroVenturesCarousel({
  ventures,
}: {
  ventures: Venture[];
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (ventures.length <= 1 || paused || reducedMotion) return;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % ventures.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [ventures.length, paused, reducedMotion]);

  const goTo = (i: number) => {
    if (i < 0 || i >= ventures.length || i === active) return;
    setActive(i);
  };

  if (ventures.length === 0) {
    return (
      <section className="relative flex h-[100svh] w-full items-center justify-center bg-bark text-cream">
        <p className="text-body text-cream/80">
          The first ventures are being drawn.
        </p>
      </section>
    );
  }

  return (
    <section
      className="relative h-[100svh] w-full overflow-hidden bg-bark"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Featured ventures"
    >
      {ventures.map((v, i) => {
        const isActive = i === active;
        const open = isOpen(v);
        return (
          <div
            key={v.slug}
            className={`absolute inset-0 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isActive
                ? "z-10 opacity-100"
                : "pointer-events-none z-0 opacity-0"
            }`}
            style={{
              transitionProperty: "opacity",
              transitionDuration: `${FADE_MS}ms`,
            }}
            aria-hidden={!isActive}
          >
            {/* Background image with soft blur + slow zoom while active */}
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={v.heroImage}
                alt={v.name}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover blur-[1.5px] ease-out"
                style={{
                  transform: isActive ? "scale(1.12)" : "scale(1.04)",
                  transitionProperty: "transform",
                  transitionDuration: `${SLIDE_DURATION_MS + FADE_MS}ms`,
                }}
              />
            </div>

            {/* Darken layers — flat black + vertical gradient + left vignette */}
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-transparent" />

            {/* Content */}
            <div className="container-page relative flex h-full flex-col justify-end pb-32 md:justify-center md:pb-24">
              <div className="max-w-3xl text-cream">
                <Reveal active={isActive} delay={200}>
                  <div className="inline-flex items-center gap-2 border border-cream/60 bg-black/25 px-3 py-1.5 backdrop-blur-sm">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        open ? "bg-olive" : "bg-cream/70"
                      }`}
                    />
                    <p className="text-[10px] uppercase tracking-[0.32em] text-cream">
                      {open ? "Now open" : "Coming soon"}
                    </p>
                  </div>
                </Reveal>

                <Reveal active={isActive} delay={320}>
                  <p className="mt-8 text-xs uppercase tracking-[0.36em] text-cream/85">
                    {v.location}
                  </p>
                </Reveal>

                <Reveal active={isActive} delay={440}>
                  <h1 className="mt-4 font-serif text-hero leading-[1.02] drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]">
                    {v.name}
                  </h1>
                </Reveal>

                {v.tagline && (
                  <Reveal active={isActive} delay={620}>
                    <p className="mt-8 max-w-2xl text-body text-cream/90">
                      {v.tagline}
                    </p>
                  </Reveal>
                )}

                <Reveal active={isActive} delay={760}>
                  <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                    {v.totalAcres != null && (
                      <span className="flex items-baseline gap-2">
                        <span className="font-serif text-h3">
                          {v.totalAcres}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.28em] text-cream/75">
                          acres
                        </span>
                      </span>
                    )}
                    {v.totalAcres != null && v.region && (
                      <span className="h-1 w-1 rounded-full bg-cream/40" />
                    )}
                    {v.region && (
                      <span className="text-[11px] uppercase tracking-[0.28em] text-cream/85">
                        {v.region}
                      </span>
                    )}
                  </div>
                </Reveal>

                <Reveal active={isActive} delay={900}>
                  <div className="mt-12">
                    <Link
                      href={`/ventures/${v.slug}`}
                      className="group inline-flex items-center gap-4 border border-cream/70 px-8 py-4 text-[11px] uppercase tracking-[0.32em] text-cream transition-all duration-500 hover:bg-cream hover:text-charcoal"
                    >
                      View Venture
                      <ArrowRight
                        size={16}
                        className="transition-transform duration-500 group-hover:translate-x-1"
                      />
                    </Link>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination bars */}
      {ventures.length > 1 && (
        <div className="absolute inset-x-0 bottom-10 z-20 flex justify-center gap-3">
          {ventures.map((v, i) => (
            <button
              key={v.slug}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show ${v.name}`}
              aria-current={i === active}
              className="group flex h-6 items-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-cream"
            >
              <span
                className={`block h-px transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  i === active
                    ? "w-14 bg-cream"
                    : "w-6 bg-cream/40 group-hover:bg-cream/70"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Slide counter */}
      {ventures.length > 1 && (
        <div className="absolute bottom-10 right-6 z-20 text-[11px] uppercase tracking-[0.32em] text-cream/70 md:right-12">
          <span className="text-cream">
            {String(active + 1).padStart(2, "0")}
          </span>
          <span className="mx-2 text-cream/40">/</span>
          <span>{String(ventures.length).padStart(2, "0")}</span>
        </div>
      )}
    </section>
  );
}

/** Fades and lifts children into view when `active` becomes true, with a delay
 *  so multiple Reveals inside the same slide stagger nicely. */
function Reveal({
  active,
  delay,
  children,
}: {
  active: boolean;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        transitionProperty: "opacity, transform",
        transitionDuration: "1000ms",
        transitionDelay: active ? `${delay}ms` : "0ms",
        opacity: active ? 1 : 0,
        transform: active ? "translateY(0)" : "translateY(24px)",
      }}
    >
      {children}
    </div>
  );
}
