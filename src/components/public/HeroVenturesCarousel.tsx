"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { isOpen, type Venture } from "@/lib/content";

const SPEED_PX_PER_SEC = 32;
const RESUME_AFTER_MS = 1800;
const DRAG_THRESHOLD_PX = 8;

export default function HeroVenturesCarousel({
  ventures,
}: {
  ventures: Venture[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const [singleSetWidth, setSingleSetWidth] = useState(0);

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const hoveredRef = useRef(false);
  const draggingRef = useRef(false);
  const pausedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const dragMovedRef = useRef(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const repeatCount =
    ventures.length === 0 ? 0 : ventures.length < 4 ? 4 : 2;
  const loop = Array.from({ length: repeatCount }).flatMap(() => ventures);

  useEffect(() => {
    if (repeatCount === 0) return;

    const measure = () => {
      if (!trackRef.current) return;
      const total = trackRef.current.scrollWidth;
      setSingleSetWidth(total / repeatCount);
    };

    measure();
    // Images may size in after mount — remeasure once they've settled.
    const t = setTimeout(measure, 250);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [repeatCount, ventures.length]);

  useEffect(() => {
    if (singleSetWidth === 0) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const tick = (t: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = t;
      const dt = (t - lastTimeRef.current) / 1000;
      lastTimeRef.current = t;

      const canAdvance =
        !prefersReduced &&
        !hoveredRef.current &&
        !draggingRef.current &&
        !pausedRef.current;

      if (canAdvance) {
        offsetRef.current += SPEED_PX_PER_SEC * dt;
      }

      if (offsetRef.current >= singleSetWidth)
        offsetRef.current -= singleSetWidth;
      if (offsetRef.current < 0) offsetRef.current += singleSetWidth;

      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = 0;
    };
  }, [singleSetWidth]);

  const pauseTemporarily = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_AFTER_MS);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    dragMovedRef.current = 0;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = offsetRef.current;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    dragMovedRef.current = Math.max(dragMovedRef.current, Math.abs(dx));
    offsetRef.current = dragStartOffsetRef.current - dx;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore — capture may have been lost */
    }
    pauseTemporarily();
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
      className="relative h-[100svh] w-full select-none overflow-hidden bg-bark"
      aria-label="Featured ventures"
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseEnter={() => (hoveredRef.current = true)}
        onMouseLeave={() => (hoveredRef.current = false)}
        className="h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
      >
        <div
          ref={trackRef}
          className="flex h-full items-center gap-5 pl-6 will-change-transform sm:gap-6 md:gap-8 md:pl-12"
          style={{ transform: "translate3d(0,0,0)" }}
        >
          {loop.map((v, i) => {
            const open = isOpen(v);
            return (
              <Link
                key={`${v.slug}-${i}`}
                href={`/ventures/${v.slug}`}
                draggable={false}
                onClick={(e) => {
                  if (dragMovedRef.current > DRAG_THRESHOLD_PX)
                    e.preventDefault();
                }}
                className="group relative block h-[82%] w-[82vw] shrink-0 overflow-hidden shadow-float sm:w-[70vw] md:w-[55vw] lg:h-[80%] lg:w-[44vw] xl:w-[38vw]"
              >
                <Image
                  src={v.heroImage}
                  alt={v.name}
                  fill
                  sizes="(min-width: 1280px) 38vw, (min-width: 1024px) 44vw, (min-width: 768px) 55vw, (min-width: 640px) 70vw, 82vw"
                  className="pointer-events-none object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                  draggable={false}
                  priority={i < 2}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/25" />

                <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2 border border-cream/60 bg-black/25 px-3 py-1.5 backdrop-blur-sm md:left-6 md:top-6">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${open ? "bg-olive" : "bg-cream/70"}`}
                  />
                  <p className="text-[10px] uppercase tracking-[0.28em] text-cream">
                    {open ? "Now open" : "Coming soon"}
                  </p>
                </div>

                <div className="pointer-events-none absolute inset-x-5 bottom-5 space-y-3 text-cream md:inset-x-8 md:bottom-8 md:space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-cream/85 md:text-[11px]">
                    {v.location}
                  </p>
                  <h2 className="font-serif text-h2 leading-[1.05] drop-shadow-[0_2px_20px_rgba(0,0,0,0.45)] md:text-h1">
                    {v.name}
                  </h2>
                  {v.tagline && (
                    <p className="line-clamp-2 max-w-md text-body-sm text-cream/85">
                      {v.tagline}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
                    {v.totalAcres != null && (
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-serif text-h4">
                          {v.totalAcres}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.24em] text-cream/70">
                          acres
                        </span>
                      </span>
                    )}
                    {v.totalAcres != null && v.region && (
                      <span className="h-1 w-1 rounded-full bg-cream/40" />
                    )}
                    {v.region && (
                      <span className="text-[10px] uppercase tracking-[0.28em] text-cream/80 md:text-[11px]">
                        {v.region}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 pt-3">
                    <span className="text-[10px] uppercase tracking-[0.32em] md:text-[11px]">
                      View Venture
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center border border-cream/70 transition-all duration-500 group-hover:bg-cream group-hover:text-charcoal md:h-11 md:w-11">
                      <ArrowRight size={16} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-bark to-transparent md:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-bark to-transparent md:w-28" />

      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.36em] text-cream/60">
        Drag or hover to explore
      </div>
    </section>
  );
}
