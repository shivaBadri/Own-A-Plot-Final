"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Maximize2, X, ArrowRight, Search } from "lucide-react";
import {
  PLOT_STATUS_STYLES,
  PLOT_STATUS_ORDER,
  NON_PLOT_STYLE,
  polygonCentroid,
  polygonBounds,
  toSvgPoints,
  type LayoutView,
  type LayoutShapeView,
  type PlotStatus,
} from "@/lib/layout";
import { formatPrice, formatSqft } from "@/lib/format";

/** Which optional behaviours are on. Defaults keep the component usable if a
 * caller renders it without wiring the Feature Manager. */
export interface MasterLayoutFeatures {
  plotSearch: boolean;
  autoZoom: boolean;
}

const DEFAULT_FEATURES: MasterLayoutFeatures = {
  plotSearch: true,
  autoZoom: true,
};

const MIN_SCALE = 1;
const MAX_SCALE = 8;
const ZOOM_STEP = 1.6;

interface Transform {
  scale: number;
  /** Translation in CONTAINER pixels, applied after scaling. */
  x: number;
  y: number;
}

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

/**
 * Interactive master layout.
 *
 * The plan image is never modified — polygons are an SVG overlay sharing the
 * image's coordinate space via a viewBox of its intrinsic pixel size. Because
 * the stored points are normalised 0..1, the only per-render maths is a
 * multiply, and the same data draws correctly at any container width and at
 * any future re-export of the artwork.
 *
 * Zoom and pan are a single CSS transform on the wrapper that holds BOTH the
 * image and the SVG, so they cannot drift apart no matter how far in you go,
 * and the browser composites it on the GPU.
 */
export default function MasterLayout({
  layouts,
  features,
}: {
  layouts: LayoutView[];
  features?: Partial<MasterLayoutFeatures>;
}) {
  const flags: MasterLayoutFeatures = { ...DEFAULT_FEATURES, ...features };

  const [activeLayoutId, setActiveLayoutId] = useState(layouts[0]?.id ?? "");
  const layout =
    layouts.find((item) => item.id === activeLayoutId) ?? layouts[0];

  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Pointer bookkeeping. A Map keyed by pointerId is what makes one code path
  // serve mouse drag, single-finger pan and two-finger pinch — rather than
  // three separate listener sets that disagree at the edges.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gestureStart = useRef<{
    distance: number;
    midpoint: { x: number; y: number };
    transform: Transform;
  } | null>(null);
  const panStart = useRef<{
    pointer: { x: number; y: number };
    transform: Transform;
  } | null>(null);
  const movedRef = useRef(false);

  const selected = useMemo(
    () => layout?.shapes.find((shape) => shape.id === selectedId) ?? null,
    [layout, selectedId]
  );

  /**
   * Search across plot number, area, facing, price and status. A single box
   * matches all five: it builds one lowercase haystack per plot (including the
   * status label and the raw square-footage/price numbers) and does a substring
   * test, so "east", "sold", "1200" and "40" all find what a buyer means.
   */
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !layout) return [] as LayoutShapeView[];
    return layout.shapes
      .filter((shape) => shape.kind === "PLOT" && shape.plot)
      .filter((shape) => {
        const p = shape.plot!;
        const haystack = [
          p.plotNumber,
          p.facing ?? "",
          p.dimensions ?? "",
          PLOT_STATUS_STYLES[p.status as PlotStatus].label,
          String(p.sizeSqft),
          p.priceOnRequest ? "on enquiry" : String(p.price),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [query, layout]);

  /** Keeps the plan inside its frame — you cannot drag it off into space. */
  const clamp = useCallback((next: Transform): Transform => {
    const container = containerRef.current;
    if (!container) return next;

    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
    const { width, height } = container.getBoundingClientRect();
    const maxX = (width * (scale - 1)) / 2;
    const maxY = (height * (scale - 1)) / 2;

    return {
      scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  /** Zooms about a fixed point so the pixel under the cursor stays put. */
  const zoomAt = useCallback(
    (factor: number, originX?: number, originY?: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const cx = originX ?? rect.width / 2;
      const cy = originY ?? rect.height / 2;

      setTransform((current) => {
        const scale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, current.scale * factor)
        );
        const ratio = scale / current.scale;

        // Solve for the translation that keeps (cx, cy) stationary.
        const offsetX = cx - rect.width / 2;
        const offsetY = cy - rect.height / 2;

        return clamp({
          scale,
          x: offsetX - (offsetX - current.x) * ratio,
          y: offsetY - (offsetY - current.y) * ratio,
        });
      });
    },
    [clamp]
  );

  const reset = useCallback(() => {
    setAnimating(true);
    setTransform(IDENTITY);
    setSelectedId(null);
  }, []);

  /**
   * Smoothly frames a shape so it sits centred and comfortably filled in the
   * viewport — the "auto zoom" on plot selection.
   *
   * The plan is drawn `object-contain`, so a normalised image point is first
   * mapped through the letterbox (the fitted rect inside the container) before
   * the wrapper transform is solved. Getting that letterbox wrong is what makes
   * naive auto-zoom land the plot off to one side.
   */
  const frameShape = useCallback(
    (shape: LayoutShapeView) => {
      const container = containerRef.current;
      if (!container || !layout) return;

      const { width: W, height: H } = container.getBoundingClientRect();
      if (W === 0 || H === 0) return;

      const fit = Math.min(W / layout.imageWidth, H / layout.imageHeight);
      const renderedW = layout.imageWidth * fit;
      const renderedH = layout.imageHeight * fit;
      const padX = (W - renderedW) / 2;
      const padY = (H - renderedH) / 2;

      const b = polygonBounds(shape.points);
      // Plot centre and extent, in container pixels at scale 1.
      const cx = padX + ((b.minX + b.maxX) / 2) * renderedW;
      const cy = padY + ((b.minY + b.maxY) / 2) * renderedH;
      const plotW = Math.max((b.maxX - b.minX) * renderedW, 1);
      const plotH = Math.max((b.maxY - b.minY) * renderedH, 1);

      // Fill ~55% of the smaller viewport dimension; clamp to the zoom range.
      const target = Math.min(
        MAX_SCALE,
        Math.max(1.6, (0.55 * Math.min(W, H)) / Math.max(plotW, plotH))
      );

      setAnimating(true);
      setTransform(
        clamp({
          scale: target,
          x: -target * (cx - W / 2),
          y: -target * (cy - H / 2),
        })
      );
    },
    [clamp, layout]
  );

  /** Select a shape and, when enabled, auto-zoom to frame it. */
  const selectAndFrame = useCallback(
    (shape: LayoutShapeView) => {
      setSelectedId(shape.id);
      if (flags.autoZoom) frameShape(shape);
    },
    [flags.autoZoom, frameShape]
  );

  /**
   * Wheel zoom is registered manually with `{ passive: false }`.
   *
   * React's onWheel is passive, so `preventDefault()` inside it is ignored and
   * the page scrolls away underneath while you are trying to zoom the plan.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && Math.abs(event.deltaY) < 2) return;
      event.preventDefault();
      const rect = container!.getBoundingClientRect();
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      setAnimating(false);
      zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top);
    }

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function handlePointerDown(event: React.PointerEvent) {
    const container = containerRef.current;
    if (!container) return;

    (event.target as Element).setPointerCapture?.(event.pointerId);
    const rect = container.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    pointers.current.set(event.pointerId, point);
    movedRef.current = false;
    setAnimating(false);

    const active = [...pointers.current.values()];
    if (active.length === 2) {
      gestureStart.current = {
        distance: distanceBetween(active[0], active[1]),
        midpoint: {
          x: (active[0].x + active[1].x) / 2,
          y: (active[0].y + active[1].y) / 2,
        },
        transform,
      };
      panStart.current = null;
    } else if (active.length === 1) {
      panStart.current = { pointer: point, transform };
    }
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    pointers.current.set(event.pointerId, point);

    const active = [...pointers.current.values()];

    // --- Two fingers: pinch zoom about the midpoint -----------------------
    if (active.length === 2 && gestureStart.current) {
      const start = gestureStart.current;
      const distance = distanceBetween(active[0], active[1]);
      if (start.distance === 0) return;

      movedRef.current = true;
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, start.transform.scale * (distance / start.distance))
      );
      const ratio = scale / start.transform.scale;
      const offsetX = start.midpoint.x - rect.width / 2;
      const offsetY = start.midpoint.y - rect.height / 2;

      setTransform(
        clamp({
          scale,
          x: offsetX - (offsetX - start.transform.x) * ratio,
          y: offsetY - (offsetY - start.transform.y) * ratio,
        })
      );
      return;
    }

    // --- One pointer: pan --------------------------------------------------
    if (active.length === 1 && panStart.current) {
      const start = panStart.current;
      const dx = point.x - start.pointer.x;
      const dy = point.y - start.pointer.y;

      // A few pixels of travel is a click with a shaky hand, not a drag. This
      // threshold is what stops a tap on a plot from being swallowed as a pan.
      if (Math.hypot(dx, dy) > 4) movedRef.current = true;
      if (!movedRef.current) return;

      setTransform(
        clamp({
          scale: start.transform.scale,
          x: start.transform.x + dx,
          y: start.transform.y + dy,
        })
      );
    }
  }

  function handlePointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) gestureStart.current = null;
    if (pointers.current.size === 0) panStart.current = null;
  }

  function handleShapeActivate(shape: LayoutShapeView) {
    // Suppress the click that ends a drag.
    if (movedRef.current) return;
    if (shape.kind !== "PLOT" || !shape.plot) return;
    // Tapping the already-open plot closes it and returns to the full plan.
    if (shape.id === selectedId) {
      setSelectedId(null);
      return;
    }
    selectAndFrame(shape);
  }

  if (!layout) return null;

  const plotShapes = layout.shapes.filter(
    (shape) => shape.kind === "PLOT" && shape.plot
  );
  const contextShapes = layout.shapes.filter(
    (shape) => shape.kind !== "PLOT" || !shape.plot
  );

  const counts = PLOT_STATUS_ORDER.map((status) => ({
    status,
    count: plotShapes.filter((shape) => shape.plot?.status === status).length,
  })).filter((entry) => entry.count > 0);

  return (
    <div>
      {/* Phase switcher — only when there is more than one plan. */}
      {layouts.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-3">
          {layouts.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveLayoutId(item.id);
                setSelectedId(null);
                setTransform(IDENTITY);
              }}
              className={`border px-5 py-2.5 text-[11px] uppercase tracking-[0.22em] transition-colors duration-500 ${
                item.id === layout.id
                  ? "border-charcoal bg-charcoal text-cream"
                  : "border-charcoal/25 text-muted hover:border-charcoal hover:text-charcoal"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        {/* ---- Plot search ---- */}
        {flags.plotSearch && plotShapes.length > 0 && (
          <div className="absolute left-4 top-4 z-20 w-[min(20rem,calc(100%-2rem))]">
            <div className="flex items-center gap-2 border border-charcoal/15 bg-cream/95 px-3 py-2.5 shadow-soft backdrop-blur-sm">
              <Search size={15} strokeWidth={1.5} className="shrink-0 text-muted" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search plot no, area, facing, price, status"
                aria-label="Search plots"
                className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-muted/70 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchOpen(false);
                  }}
                  aria-label="Clear search"
                  className="shrink-0 text-muted transition-colors hover:text-charcoal"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>

            {searchOpen && query.trim() && (
              <ul className="mt-1 max-h-64 overflow-y-auto border border-charcoal/15 bg-cream/97 shadow-soft backdrop-blur-sm">
                {searchResults.length === 0 ? (
                  <li className="px-3 py-3 text-[12px] text-muted">
                    No plots match “{query.trim()}”.
                  </li>
                ) : (
                  searchResults.map((shape) => {
                    const p = shape.plot!;
                    const style = PLOT_STATUS_STYLES[p.status as PlotStatus];
                    return (
                      <li key={shape.id}>
                        <button
                          type="button"
                          onClick={() => {
                            selectAndFrame(shape);
                            setSearchOpen(false);
                          }}
                          className="flex w-full items-center justify-between gap-3 border-b border-charcoal/8 px-3 py-2.5 text-left transition-colors duration-300 last:border-0 hover:bg-sand/40"
                        >
                          <span className="min-w-0">
                            <span className="block font-serif text-sm text-charcoal">
                              {p.plotNumber}
                            </span>
                            <span className="block truncate text-[11px] text-muted">
                              {formatSqft(p.sizeSqft)}
                              {p.facing ? ` · ${p.facing}` : ""} ·{" "}
                              {formatPrice(p.price, p.priceOnRequest)}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted">
                            <span
                              aria-hidden
                              className="inline-block h-2 w-2"
                              style={{ backgroundColor: style.swatch }}
                            />
                            {style.label}
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>
        )}

        {/* ---- The plan ---- */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative aspect-[4/3] w-full cursor-grab touch-none overflow-hidden border border-charcoal/15 bg-sand/20 active:cursor-grabbing md:aspect-[16/10]"
          style={{ touchAction: "none" }}
        >
          <div
            className="absolute inset-0 origin-center will-change-transform"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transition: animating
                ? "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)"
                : "none",
            }}
            onTransitionEnd={() => setAnimating(false)}
          >
            {/*
              A plain <img>, not next/image. The plan must fill the frame with
              `object-contain` at an aspect ratio nobody knows until upload, and
              it is dragged and scaled every frame — next/image's fill layout
              adds a wrapper that fights the transform for no benefit here,
              since Cloudinary already serves an optimised asset.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={layout.imageUrl}
              alt={`${layout.name} plan`}
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-contain"
            />

            <svg
              viewBox={`0 0 ${layout.imageWidth} ${layout.imageHeight}`}
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 h-full w-full"
              role="group"
              aria-label={`${layout.name} — ${plotShapes.length} plots`}
            >
              {/* Context first, so plots always sit on top of roads. */}
              {contextShapes.map((shape) => (
                <polygon
                  key={shape.id}
                  points={toSvgPoints(
                    shape.points,
                    layout.imageWidth,
                    layout.imageHeight
                  )}
                  fill={NON_PLOT_STYLE.fill}
                  stroke={NON_PLOT_STYLE.stroke}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              ))}

              {plotShapes.map((shape) => {
                const status = shape.plot!.status as PlotStatus;
                const style = PLOT_STATUS_STYLES[status];
                const isSelected = shape.id === selectedId;
                const isHovered = shape.id === hoveredId;
                const centroid = polygonCentroid(shape.points);

                return (
                  <g key={shape.id}>
                    <polygon
                      points={toSvgPoints(
                        shape.points,
                        layout.imageWidth,
                        layout.imageHeight
                      )}
                      fill={
                        isSelected
                          ? style.fillActive
                          : isHovered
                            ? style.fillHover
                            : style.fill
                      }
                      stroke={style.stroke}
                      strokeWidth={isSelected ? 3 : 1.5}
                      vectorEffect="non-scaling-stroke"
                      tabIndex={0}
                      role="button"
                      aria-label={`Plot ${shape.plot!.plotNumber} — ${style.label}`}
                      aria-pressed={isSelected}
                      onPointerEnter={() => setHoveredId(shape.id)}
                      onPointerLeave={() =>
                        setHoveredId((current) =>
                          current === shape.id ? null : current
                        )
                      }
                      onClick={() => handleShapeActivate(shape)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          movedRef.current = false;
                          handleShapeActivate(shape);
                        }
                      }}
                      className="cursor-pointer outline-none transition-[fill] duration-300 focus-visible:stroke-[4]"
                    />

                    {/*
                      Labels are hidden until the reader zooms past 1.4x.
                      At the default fit-to-frame size a 200-plot venture
                      renders 200 overlapping numbers and the plan becomes
                      unreadable — which is the opposite of the point.
                    */}
                    {transform.scale > 1.4 && (
                      <text
                        x={centroid.x * layout.imageWidth}
                        y={centroid.y * layout.imageHeight}
                        textAnchor="middle"
                        dominantBaseline="central"
                        pointerEvents="none"
                        className="select-none"
                        style={{
                          fontSize: `${Math.max(10, layout.imageWidth / 90)}px`,
                          fill: "#2B2B27",
                          fontWeight: 500,
                          paintOrder: "stroke",
                          stroke: "rgba(250, 247, 240, 0.85)",
                          strokeWidth: 3,
                        }}
                      >
                        {shape.plot!.plotNumber}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ---- Zoom controls ---- */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-px border border-charcoal/15 bg-cream/95 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setAnimating(true);
                zoomAt(ZOOM_STEP);
              }}
              aria-label="Zoom in"
              disabled={transform.scale >= MAX_SCALE}
              className="flex h-11 w-11 items-center justify-center transition-colors duration-300 hover:bg-sand/40 disabled:opacity-30"
            >
              <Plus size={16} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => {
                setAnimating(true);
                zoomAt(1 / ZOOM_STEP);
              }}
              aria-label="Zoom out"
              disabled={transform.scale <= MIN_SCALE}
              className="flex h-11 w-11 items-center justify-center border-t border-charcoal/15 transition-colors duration-300 hover:bg-sand/40 disabled:opacity-30"
            >
              <Minus size={16} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={reset}
              aria-label="Reset view"
              className="flex h-11 w-11 items-center justify-center border-t border-charcoal/15 transition-colors duration-300 hover:bg-sand/40"
            >
              <Maximize2 size={15} strokeWidth={1.5} />
            </button>
          </div>

          <p className="pointer-events-none absolute bottom-4 left-4 text-[10px] uppercase tracking-[0.22em] text-charcoal/45">
            Drag to pan · Pinch or scroll to zoom
          </p>

          {/* ---- Plot detail ---- */}
          {selected?.plot && (
            <div className="animate-fadeIn absolute inset-x-4 bottom-4 max-h-[85%] overflow-y-auto border border-charcoal/15 bg-cream/97 p-6 shadow-float backdrop-blur-sm md:inset-x-auto md:right-4 md:top-4 md:bottom-auto md:w-80">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Plot</p>
                  <p className="mt-2 font-serif text-h3 leading-none">
                    {selected.plot.plotNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close plot details"
                  className="flex h-9 w-9 shrink-0 items-center justify-center border border-charcoal/20 transition-colors duration-300 hover:bg-sand/40"
                >
                  <X size={15} strokeWidth={1.5} />
                </button>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <span
                  className="inline-block h-2.5 w-2.5"
                  style={{
                    backgroundColor:
                      PLOT_STATUS_STYLES[selected.plot.status as PlotStatus]
                        .swatch,
                  }}
                />
                <span className="text-[11px] uppercase tracking-[0.22em]">
                  {PLOT_STATUS_STYLES[selected.plot.status as PlotStatus].label}
                </span>
              </div>

              <dl className="mt-6 space-y-4 border-t border-charcoal/10 pt-6">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-muted">
                    Area
                  </dt>
                  <dd className="text-body-sm">
                    {formatSqft(selected.plot.sizeSqft)}
                  </dd>
                </div>

                {selected.plot.dimensions && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[10px] uppercase tracking-[0.22em] text-muted">
                      Dimensions
                    </dt>
                    <dd className="text-body-sm">{selected.plot.dimensions}</dd>
                  </div>
                )}

                {selected.plot.facing && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[10px] uppercase tracking-[0.22em] text-muted">
                      Facing
                    </dt>
                    <dd className="text-body-sm">{selected.plot.facing}</dd>
                  </div>
                )}

                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-muted">
                    Price
                  </dt>
                  <dd className="font-serif text-base">
                    {formatPrice(
                      selected.plot.price,
                      selected.plot.priceOnRequest
                    )}
                  </dd>
                </div>
              </dl>

              {selected.plot.description && (
                <p className="mt-6 border-t border-charcoal/10 pt-6 text-body-sm leading-relaxed text-muted">
                  {selected.plot.description}
                </p>
              )}

              <p className="mt-6 text-[11px] leading-relaxed text-muted">
                {PLOT_STATUS_STYLES[selected.plot.status as PlotStatus]
                  .description}
              </p>

              <Link
                href={`/plots/${selected.plot.id}#enquire`}
                className="btn-admin-solid group mt-7 w-full"
              >
                Enquire now
                <ArrowRight
                  size={14}
                  className="transition-transform duration-500 group-hover:translate-x-1"
                />
              </Link>
            </div>
          )}
        </div>

        {/* ---- Legend ---- */}
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          {PLOT_STATUS_ORDER.map((status) => {
            const entry = counts.find((item) => item.status === status);
            return (
              <span
                key={status}
                className={`flex items-center gap-3 ${entry ? "" : "opacity-35"}`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0"
                  style={{
                    backgroundColor: PLOT_STATUS_STYLES[status].swatch,
                  }}
                />
                <span className="text-[11px] uppercase tracking-[0.22em] text-muted">
                  {PLOT_STATUS_STYLES[status].label}
                  {entry ? ` · ${entry.count}` : ""}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
