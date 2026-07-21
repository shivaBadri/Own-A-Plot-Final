"use client";

import Image from "next/image";
import { useState } from "react";
import type { AccentKey, RichRow } from "@/lib/content";

const accentClasses: Record<
  AccentKey,
  { dot: string; activeText: string; ruleActive: string }
> = {
  olive: { dot: "bg-olive", activeText: "text-olive", ruleActive: "bg-olive" },
  earth: { dot: "bg-earth", activeText: "text-earth", ruleActive: "bg-earth" },
  bark: { dot: "bg-bark", activeText: "text-bark", ruleActive: "bg-bark" },
};

/**
 * Approved component, unchanged. Rows now come from the `advantages` JSON column
 * instead of a static array. Rows without an image are tolerated — the stage
 * simply shows nothing rather than rendering a broken <Image>.
 */
export default function LocationAdvantages({
  advantages,
  accent = "olive",
}: {
  advantages: RichRow[];
  accent?: AccentKey;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tone = accentClasses[accent];

  if (advantages.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-5">
        <p className="eyebrow">Location Advantages</p>
        <h3 className="mt-6 font-serif text-h3">Why this ground, why now.</h3>
        <p className="prose-max mt-6 text-body text-muted">
          Hover a line on the right to see the ground it describes.
        </p>

        <div className="mt-10 hidden lg:sticky lg:top-28 lg:block">
          <div className="relative aspect-[4/5] w-full overflow-hidden border border-charcoal/10 bg-sand/25">
            {advantages.map((a, i) =>
              a.image ? (
                <Image
                  key={`${a.title}-${i}`}
                  src={a.image}
                  alt={a.title}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className={`object-cover transition-opacity duration-700 ease-out ${
                    i === activeIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ) : null
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-6 pt-16">
              <p className="text-[10px] uppercase tracking-[0.32em] text-cream/80">
                {String(activeIndex + 1).padStart(2, "0")} /{" "}
                {String(advantages.length).padStart(2, "0")}
              </p>
              <p className="mt-2 font-serif text-h4 text-cream">
                {advantages[activeIndex]?.title}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ul
        className="lg:col-span-7 lg:border-t lg:border-charcoal/10"
        onMouseLeave={() => setActiveIndex(0)}
      >
        {advantages.map((a, i) => {
          const isActive = i === activeIndex;
          return (
            <li
              key={`${a.title}-${i}`}
              className="group/item relative border-t border-charcoal/10 first:border-t-0 lg:first:border-t-0"
              onMouseEnter={() => setActiveIndex(i)}
              onFocus={() => setActiveIndex(i)}
              tabIndex={0}
            >
              {a.image && (
                <div className="relative mt-8 aspect-[16/10] w-full overflow-hidden border border-charcoal/10 lg:hidden">
                  <Image
                    src={a.image}
                    alt={a.title}
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>
              )}

              <div className="flex items-start gap-6 py-8 lg:gap-8 lg:py-10">
                <div className="pt-3">
                  <span
                    className={`block h-px w-8 transition-all duration-500 lg:w-10 ${
                      isActive ? `${tone.ruleActive} lg:w-16` : "bg-charcoal/25"
                    }`}
                  />
                  <span className="mt-3 block text-[10px] uppercase tracking-[0.28em] text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4
                      className={`font-serif text-h4 transition-colors duration-500 ${
                        isActive ? tone.activeText : ""
                      }`}
                    >
                      {a.title}
                    </h4>
                    <span
                      className={`hidden h-1.5 w-1.5 rounded-full transition-opacity duration-500 lg:inline-block ${
                        tone.dot
                      } ${isActive ? "opacity-100" : "opacity-0"}`}
                      aria-hidden
                    />
                  </div>
                  <p className="prose-max mt-4 text-body text-muted">{a.body}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
