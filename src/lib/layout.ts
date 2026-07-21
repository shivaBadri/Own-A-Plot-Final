/**
 * Shared vocabulary for the interactive master layout.
 *
 * Imported by the public viewer, the admin editor and the API, so the colour a
 * plot is painted, the string an API validates and the swatch in the legend can
 * never disagree.
 */

export type PlotStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "BOOKED"
  | "SOLD"
  | "BLOCKED";

export type LayoutShapeKind =
  | "PLOT"
  | "AMENITY"
  | "ROAD"
  | "PARK"
  | "ENTRANCE"
  | "OTHER";

export interface StatusStyle {
  label: string;
  /** Polygon fill. Alpha is low so the plan stays readable underneath. */
  fill: string;
  /** Fill once the pointer is over the shape. */
  fillHover: string;
  /** Fill for the currently selected shape. */
  fillActive: string;
  stroke: string;
  /** Solid colour for legend swatches and chips. */
  swatch: string;
  /** Whether this state can be enquired about. */
  sellable: boolean;
  description: string;
}

/**
 * The five states, in the brief's colours.
 *
 * These are deliberately literal hex values rather than Tailwind tokens: they
 * are written into SVG `fill` attributes, which cannot resolve a Tailwind class,
 * and they must be identical between the public viewer and the admin editor.
 */
export const PLOT_STATUS_STYLES: Record<PlotStatus, StatusStyle> = {
  AVAILABLE: {
    label: "Available",
    fill: "rgba(34, 139, 76, 0.32)",
    fillHover: "rgba(34, 139, 76, 0.55)",
    fillActive: "rgba(34, 139, 76, 0.70)",
    stroke: "#1B7A42",
    swatch: "#228B4C",
    sellable: true,
    description: "Open for booking.",
  },
  RESERVED: {
    label: "Reserved",
    fill: "rgba(214, 166, 46, 0.34)",
    fillHover: "rgba(214, 166, 46, 0.58)",
    fillActive: "rgba(214, 166, 46, 0.74)",
    stroke: "#B98C1E",
    swatch: "#D6A62E",
    sellable: true,
    description: "On hold for a buyer. Ask us about the release date.",
  },
  BOOKED: {
    label: "Booked",
    fill: "rgba(45, 106, 179, 0.32)",
    fillHover: "rgba(45, 106, 179, 0.55)",
    fillActive: "rgba(45, 106, 179, 0.70)",
    stroke: "#245A96",
    swatch: "#2D6AB3",
    sellable: false,
    description: "Paid for, registration in progress.",
  },
  SOLD: {
    label: "Sold",
    fill: "rgba(178, 52, 44, 0.30)",
    fillHover: "rgba(178, 52, 44, 0.50)",
    fillActive: "rgba(178, 52, 44, 0.66)",
    stroke: "#932C25",
    swatch: "#B2342C",
    sellable: false,
    description: "Registered to its owner.",
  },
  BLOCKED: {
    label: "Blocked",
    fill: "rgba(110, 110, 105, 0.30)",
    fillHover: "rgba(110, 110, 105, 0.44)",
    fillActive: "rgba(110, 110, 105, 0.56)",
    stroke: "#5C5C57",
    swatch: "#6E6E69",
    sellable: false,
    description: "Not for sale — utilities, easement or common land.",
  },
};

/** Legend order. Matches the brief and reads best-to-worst for a buyer. */
export const PLOT_STATUS_ORDER: PlotStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "BOOKED",
  "SOLD",
  "BLOCKED",
];

export const SHAPE_KIND_LABELS: Record<LayoutShapeKind, string> = {
  PLOT: "Plot",
  AMENITY: "Amenity",
  ROAD: "Road",
  PARK: "Open space",
  ENTRANCE: "Entrance",
  OTHER: "Other",
};

/** Non-plot shapes are context, not inventory: drawn, never clickable. */
export const NON_PLOT_STYLE = {
  fill: "rgba(58, 58, 54, 0.10)",
  stroke: "rgba(58, 58, 54, 0.45)",
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export interface Point {
  /** 0..1, fraction of the image WIDTH. */
  x: number;
  /** 0..1, fraction of the image HEIGHT. */
  y: number;
}

/**
 * Parses whatever came out of the `points` JSON column into real points.
 *
 * The column is `Json`, so at the type level it is `unknown` and at runtime it
 * is whatever was last written — including by a future migration or a manual
 * fix in psql. Anything malformed is dropped rather than allowed to throw
 * inside a render and take the whole venture page down.
 */
export function parsePoints(value: unknown): Point[] {
  if (!Array.isArray(value)) return [];

  const points: Point[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const { x, y } = entry as { x?: unknown; y?: unknown };
    if (typeof x !== "number" || typeof y !== "number") continue;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    points.push({ x: clamp01(x), y: clamp01(y) });
  }
  return points;
}

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** A polygon needs three points to enclose anything. */
export function isValidPolygon(points: Point[]): boolean {
  return points.length >= 3;
}

/** Normalised points → an SVG `points` attribute in image pixel space. */
export function toSvgPoints(
  points: Point[],
  width: number,
  height: number
): string {
  return points
    .map((p) => `${(p.x * width).toFixed(2)},${(p.y * height).toFixed(2)}`)
    .join(" ");
}

/**
 * Area-weighted centroid, in normalised space.
 *
 * Used to place the plot number inside its polygon. The average of the
 * vertices is not good enough — on an L-shaped corner plot it lands outside
 * the shape, and the label ends up floating over the road.
 */
export function polygonCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0.5, y: 0.5 };
  if (points.length < 3) {
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    };
  }

  let twiceArea = 0;
  let x = 0;
  let y = 0;

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    x += (current.x + next.x) * cross;
    y += (current.y + next.y) * cross;
  }

  // Degenerate (all points collinear) — fall back to the vertex mean.
  if (Math.abs(twiceArea) < 1e-9) {
    return {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    };
  }

  const factor = 1 / (3 * twiceArea);
  return { x: x * factor, y: y * factor };
}

/** Normalised bounding box, used to zoom to a shape on selection. */
export function polygonBounds(points: Point[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * Four corners of the rectangle spanned by two opposite corners, clamped to
 * the image. Wound clockwise so the polygon renders solid.
 */
export function rectanglePoints(a: Point, b: Point): Point[] {
  const x1 = clamp01(Math.min(a.x, b.x));
  const y1 = clamp01(Math.min(a.y, b.y));
  const x2 = clamp01(Math.max(a.x, b.x));
  const y2 = clamp01(Math.max(a.y, b.y));
  return [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 },
  ];
}

/**
 * A closed polygon approximating a circle drawn from `center` out to `edge`.
 *
 * Normalised x and y are not isotropic — a fraction of the width is a different
 * pixel count than the same fraction of the height — so the radius is taken in
 * PIXELS and converted back per-axis. That keeps the shape looking round on the
 * plan instead of squashing into an ellipse on wide images.
 */
export function circlePoints(
  center: Point,
  edge: Point,
  imageWidth: number,
  imageHeight: number,
  segments = 40
): Point[] {
  const radiusPx = Math.hypot(
    (edge.x - center.x) * imageWidth,
    (edge.y - center.y) * imageHeight
  );
  const rx = radiusPx / imageWidth;
  const ry = radiusPx / imageHeight;

  const points: Point[] = [];
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: clamp01(center.x + rx * Math.cos(angle)),
      y: clamp01(center.y + ry * Math.sin(angle)),
    });
  }
  return points;
}

// ---------------------------------------------------------------------------
// View models
// ---------------------------------------------------------------------------

/** Everything the public viewer needs about one shape, already flattened. */
export interface LayoutShapeView {
  id: string;
  kind: LayoutShapeKind;
  label: string | null;
  points: Point[];
  plot: {
    id: string;
    plotNumber: string;
    sizeSqft: number;
    dimensions: string | null;
    facing: string | null;
    price: number;
    priceOnRequest: boolean;
    status: PlotStatus;
    description: string | null;
  } | null;
}

export interface LayoutView {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  shapes: LayoutShapeView[];
}
