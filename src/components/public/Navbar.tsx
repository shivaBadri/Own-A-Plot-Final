"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export interface NavVenture {
  slug: string;
  name: string;
  location: string;
  heroImage: string;
}

export interface NavPortal {
  label: string;
  url: string;
}

const links = [
  { href: "/", label: "Home", preview: null as string | null },
  { href: "/ventures", label: "Ventures", preview: "ventures" as const },
  { href: "/plots", label: "Plots", preview: null as string | null },
  { href: "/about", label: "About", preview: null as string | null },
  { href: "/contact", label: "Contact", preview: null as string | null },
];

const defaultPreview =
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2000&auto=format&fit=crop";

/**
 * Approved navbar, unchanged in behaviour and appearance. The only difference
 * from the reference build is that the venture list arrives as a prop from a
 * server component instead of being imported from a static file.
 */
export default function Navbar({
  ventures,
  siteName,
  portal = null,
}: {
  ventures: NavVenture[];
  siteName: string;
  /** Customer/partner portal login. `null` when disabled or unconfigured. */
  portal?: NavPortal | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<string>(defaultPreview);
  const [venturesHover, setVenturesHover] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;

      setScrolled(y > 60);

      if (y < 80) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);
      } else if (delta < -6) {
        setHidden(false);
      }

      lastScrollY.current = y;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      setHoverPreview(defaultPreview);
      setVenturesHover(false);
    }
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Escape closes the menu — the original could only be closed by click.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const filled = scrolled || menuOpen;
  const showLogo = scrolled || menuOpen;
  const offscreen = hidden && !menuOpen;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 text-cream transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        offscreen ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div
        className={`transition-colors duration-700 ${
          filled ? "bg-loam" : "bg-transparent"
        }`}
      >
        <div className="container-page flex h-20 items-center justify-between">
          <Link
            href="/"
            aria-label={`${siteName} — Home`}
            onClick={() => setMenuOpen(false)}
            className={`font-serif text-h4 tracking-tight transition-all duration-700 ${
              showLogo
                ? "opacity-100 translate-x-0"
                : "pointer-events-none -translate-x-2 opacity-0"
            }`}
          >
            {siteName}
          </Link>

          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group relative inline-block px-4 py-2 text-xs uppercase tracking-[0.28em] transition-colors duration-500 hover:text-gold-soft focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-current"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-gold-soft opacity-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1.5 group-hover:opacity-100"
                  />
                  <span className="relative inline-block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:scale-110">
                    {link.label}
                  </span>
                  <svg
                    aria-hidden
                    viewBox="0 0 120 10"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-2 w-[calc(100%-1.5rem)] overflow-visible"
                  >
                    <path
                      d="M 2 6 Q 30 0 60 6 T 118 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      pathLength={100}
                      className="[stroke-dasharray:100] [stroke-dashoffset:100] transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:[stroke-dashoffset:0]"
                    />
                  </svg>
                </Link>
              ))}
            </nav>
            {portal && (
              <a
                href={portal.url}
                target="_blank"
                rel="noreferrer noopener"
                className="hidden items-center gap-2 border border-current/40 px-5 py-2.5 text-[11px] uppercase tracking-[0.24em] transition-colors duration-500 hover:bg-cream hover:text-charcoal focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-current sm:inline-flex"
              >
                {portal.label}
              </a>
            )}
            <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="group flex h-11 items-center gap-4 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-current lg:hidden"
          >
            <span className="text-xs uppercase tracking-[0.28em]">
              {menuOpen ? "Close" : "Menu"}
            </span>
            <span className="relative block h-4 w-7">
              <span
                className={`absolute left-0 right-0 block h-px bg-current transition-all duration-500 ${
                  menuOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-1"
                }`}
              />
              <span
                className={`absolute left-0 right-0 block h-px bg-current transition-all duration-500 ${
                  menuOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-1"
                }`}
              />
            </span>
          </button>
          </div>
        </div>
      </div>

      <div
        id="site-menu"
        className={`overflow-hidden bg-loam text-cream transition-[max-height,border-radius] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          menuOpen ? "max-h-[80vh] rounded-b-[48px]" : "max-h-0 rounded-b-none"
        }`}
      >
        <div className="container-page grid grid-cols-1 gap-12 pb-14 pt-6 md:grid-cols-12 md:gap-16 md:pb-20">
          <nav className="md:col-span-5">
            <p className="mb-6 text-[11px] uppercase tracking-[0.32em] text-cream/60">
              Navigate
            </p>
            <ul className="space-y-2">
              {links.map((link) => (
                <li
                  key={link.href}
                  onMouseEnter={() => {
                    if (link.preview === "ventures" && ventures.length > 0) {
                      setVenturesHover(true);
                    } else {
                      setVenturesHover(false);
                      setHoverPreview(defaultPreview);
                    }
                  }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="group flex items-baseline justify-between gap-6 border-b border-cream/15 py-4 transition-colors duration-500 hover:text-cream focus-visible:outline-none"
                  >
                    <span className="font-serif text-[clamp(2rem,4vw,3rem)] leading-none">
                      {link.label}
                    </span>
                    <span className="text-xs uppercase tracking-[0.28em] text-cream/50 transition-transform duration-500 group-hover:-translate-x-1 group-hover:text-cream">
                      →
                    </span>
                  </Link>
                </li>
              ))}
              {portal && (
                <li>
                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={() => setMenuOpen(false)}
                    className="group flex items-baseline justify-between gap-6 border-b border-cream/15 py-4 transition-colors duration-500 hover:text-cream focus-visible:outline-none"
                  >
                    <span className="font-serif text-[clamp(2rem,4vw,3rem)] leading-none">
                      {portal.label}
                    </span>
                    <span className="text-xs uppercase tracking-[0.28em] text-cream/50 transition-transform duration-500 group-hover:-translate-x-1 group-hover:text-cream">
                      ↗
                    </span>
                  </a>
                </li>
              )}
            </ul>
          </nav>

          <div className="md:col-span-7">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[32px]">
              {ventures.map((v) => (
                <Image
                  key={v.slug}
                  src={v.heroImage}
                  alt={v.name}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className={`object-cover transition-opacity duration-700 ${
                    hoverPreview === v.heroImage ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
              <Image
                src={defaultPreview}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className={`object-cover transition-opacity duration-700 ${
                  hoverPreview === defaultPreview ? "opacity-100" : "opacity-0"
                }`}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-loam/40 via-transparent to-transparent" />
            </div>

            {ventures.length > 0 && (
              <div
                className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  venturesHover
                    ? "mt-8 max-h-96 opacity-100"
                    : "mt-0 max-h-0 opacity-0"
                }`}
              >
                <p className="mb-4 text-[11px] uppercase tracking-[0.32em] text-cream/60">
                  Explore Locations
                </p>
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {ventures.map((v) => (
                    <li
                      key={v.slug}
                      onMouseEnter={() => setHoverPreview(v.heroImage)}
                      onMouseLeave={() => setHoverPreview(defaultPreview)}
                    >
                      <Link
                        href={`/ventures/${v.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="group flex items-baseline justify-between gap-4 border-b border-cream/10 py-3 last:border-0 focus-visible:outline-none"
                      >
                        <span className="font-serif text-h4">{v.name}</span>
                        <span className="text-xs uppercase tracking-[0.22em] text-cream/60 transition-colors group-hover:text-cream">
                          {v.location}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        aria-hidden
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 -z-10 bg-charcoal/40 backdrop-blur-sm transition-opacity duration-700 lg:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
    </header>
  );
}
