"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll-reveal for anything marked `data-reveal`.
 *
 * Ported unchanged from the approved frontend, with one fix: the original ran
 * its effect on every render with no dependency array, so it re-queried the DOM
 * and re-created the observer constantly. Keying it to `pathname` means it runs
 * once per page — which is what it was always trying to do — and still catches
 * elements on client-side navigation.
 */
export default function Reveal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!els.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -80px 0px" }
    );

    els.forEach((el) => {
      el.classList.add("reveal");
      obs.observe(el);
    });

    return () => obs.disconnect();
  }, [pathname]);

  return <>{children}</>;
}
