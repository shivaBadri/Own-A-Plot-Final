import type { Project, Accent } from "@prisma/client";

/**
 * The approved frontend renders a `Venture`. The database stores a `Project`.
 * This module is the single, typed seam between the two.
 *
 * Everything the public site reads goes through `toVenture()`, so JSON columns
 * are parsed exactly once, in one place, with defensive defaults. A malformed
 * `advantages` blob can never crash a page — it degrades to an empty section.
 */

export type AccentKey = "olive" | "earth" | "bark";

export interface RichRow {
  title: string;
  body: string;
  image: string;
}

export interface DetailRow {
  label: string;
  value: string;
}

export interface NearbyRow {
  name: string;
  distance: string;
}

export interface Venture {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  location: string;
  region: string;
  totalAcres: number | null;
  status: Project["status"];
  isPublished: boolean;
  heroImage: string;
  heroVideo: string | null;
  accent: AccentKey;
  gallery: string[];
  story: {
    eyebrow: string;
    title: string;
    body: string[];
  };
  advantages: RichRow[];
  amenities: string[];
  details: DetailRow[];
  landscape: RichRow[];
  locationInfo: {
    address: string;
    coordinates: { lat: number; lng: number } | null;
    nearby: NearbyRow[];
    mapEmbed: string;
  };
  brochure: {
    fileName: string;
    fileSize: string;
    url: string;
  } | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  sortOrder: number;
}

/**
 * Last-resort hero. Only ever used when a venture has no heroImage, no
 * coverImage, and no gallery — i.e. an admin published a venture with no
 * imagery at all. Rendering a broken <Image> would be worse.
 */
export const FALLBACK_HERO =
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2400&auto=format&fit=crop";

const ACCENT_MAP: Record<Accent, AccentKey> = {
  OLIVE: "olive",
  EARTH: "earth",
  BARK: "bark",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Parses a Json column into RichRow[] — drops any entry missing a title. */
function parseRichRows(value: unknown): RichRow[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<RichRow[]>((acc, raw) => {
    if (!isRecord(raw)) return acc;
    const title = str(raw.title);
    if (!title) return acc;
    acc.push({ title, body: str(raw.body), image: str(raw.image) });
    return acc;
  }, []);
}

function parseDetailRows(value: unknown): DetailRow[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<DetailRow[]>((acc, raw) => {
    if (!isRecord(raw)) return acc;
    const label = str(raw.label);
    if (!label) return acc;
    acc.push({ label, value: str(raw.value) });
    return acc;
  }, []);
}

function parseNearbyRows(value: unknown): NearbyRow[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<NearbyRow[]>((acc, raw) => {
    if (!isRecord(raw)) return acc;
    const name = str(raw.name);
    if (!name) return acc;
    acc.push({ name, distance: str(raw.distance) });
    return acc;
  }, []);
}

export function toVenture(project: Project): Venture {
  const gallery = project.gallery.filter(Boolean);

  const heroImage =
    project.heroImage?.trim() ||
    project.coverImage?.trim() ||
    gallery[0] ||
    FALLBACK_HERO;

  const coordinates =
    typeof project.latitude === "number" && typeof project.longitude === "number"
      ? { lat: project.latitude, lng: project.longitude }
      : null;

  const brochure = project.brochureUrl
    ? {
        url: project.brochureUrl,
        fileName: project.brochureFileName || `${project.slug}.pdf`,
        fileSize: project.brochureFileSize || "PDF",
      }
    : null;

  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    tagline: project.tagline?.trim() || project.description,
    description: project.description,
    location: project.location,
    region: project.region?.trim() || project.location,
    totalAcres: project.totalAcres,
    status: project.status,
    isPublished: project.isPublished,
    heroImage,
    heroVideo: project.heroVideo?.trim() || null,
    accent: ACCENT_MAP[project.accent] ?? "olive",
    gallery,
    story: {
      eyebrow: project.storyEyebrow?.trim() || "The Ground Beneath",
      title: project.storyTitle?.trim() || "",
      body: project.storyBody.filter(Boolean),
    },
    advantages: parseRichRows(project.advantages),
    amenities: project.amenities.filter(Boolean),
    details: parseDetailRows(project.details),
    landscape: parseRichRows(project.landscape),
    locationInfo: {
      address: project.address?.trim() || project.location,
      coordinates,
      nearby: parseNearbyRows(project.nearby),
      mapEmbed: project.mapEmbed?.trim() || "",
    },
    brochure,
    seoTitle: project.seoTitle,
    seoDescription: project.seoDescription,
    featured: project.featured,
    sortOrder: project.sortOrder,
  };
}

export function toVentures(projects: Project[]): Venture[] {
  return projects.map(toVenture);
}

/**
 * The public site labels ONGOING ventures "Now open" and everything else
 * "Coming soon". The original design hard-coded this on array index; driving
 * it from `status` is what makes the badge correct once content is editable.
 */
export function isOpen(venture: Pick<Venture, "status">): boolean {
  return venture.status === "ONGOING";
}

export const ACCENT_BAR: Record<AccentKey, string> = {
  olive: "bg-olive",
  earth: "bg-earth",
  bark: "bg-bark",
};

export const ACCENT_TEXT: Record<AccentKey, string> = {
  olive: "text-olive",
  earth: "text-earth",
  bark: "text-bark",
};
