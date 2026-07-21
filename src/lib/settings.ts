import { prisma } from "@/lib/db";
import type { SiteSettings } from "@prisma/client";
import { resolveFeatures, type Features } from "@/lib/features";

/**
 * Site settings drive the footer, the contact page, and default SEO. They are a
 * singleton row. If it does not exist yet (fresh database, seed not run), the
 * public site must still render — so this returns a fully-populated object with
 * the approved defaults rather than `null`.
 */

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
}

export interface ResolvedSettings {
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  officeHours: string;
  footerTagline: string;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  socialLinks: SocialLinks;
  /** Customer / partner portal. `portalUrl` empty string means "not set". */
  portalEnabled: boolean;
  portalLabel: string;
  portalUrl: string;
  /** Fully-resolved feature flags — every key present. */
  features: Features;
}

export const SETTINGS_DEFAULTS: ResolvedSettings = {
  siteName: "Own A Plot",
  contactEmail: "hello@ownaplot.com",
  contactPhone: "+91 99999 99999",
  address: "6th Floor, Jubilee Hills\nHyderabad, Telangana 500033",
  officeHours: "Mon – Sat, 10am – 7pm",
  footerTagline:
    "Thoughtfully planned land ventures — a quieter, more considered way to own the future.",
  defaultSeoTitle: "Own A Plot — Premium Managed Land Ventures",
  defaultSeoDescription:
    "Thoughtfully planned land ventures designed for tomorrow's growth. Discover verified ventures, transparent ownership, and a life closer to nature.",
  socialLinks: {},
  portalEnabled: false,
  portalLabel: "Login",
  portalUrl: "",
  features: resolveFeatures(null),
};

function parseSocial(value: unknown): SocialLinks {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  const out: SocialLinks = {};
  for (const key of ["facebook", "instagram", "twitter", "linkedin", "youtube"] as const) {
    const link = record[key];
    if (typeof link === "string" && link.trim()) out[key] = link.trim();
  }
  return out;
}

function pick(stored: string | null | undefined, fallback: string): string {
  return stored && stored.trim() ? stored.trim() : fallback;
}

export function resolveSettings(row: SiteSettings | null): ResolvedSettings {
  if (!row) return SETTINGS_DEFAULTS;
  return {
    siteName: pick(row.siteName, SETTINGS_DEFAULTS.siteName),
    contactEmail: pick(row.contactEmail, SETTINGS_DEFAULTS.contactEmail),
    contactPhone: pick(row.contactPhone, SETTINGS_DEFAULTS.contactPhone),
    address: pick(row.address, SETTINGS_DEFAULTS.address),
    officeHours: pick(row.officeHours, SETTINGS_DEFAULTS.officeHours),
    footerTagline: pick(row.footerTagline, SETTINGS_DEFAULTS.footerTagline),
    defaultSeoTitle: pick(row.defaultSeoTitle, SETTINGS_DEFAULTS.defaultSeoTitle),
    defaultSeoDescription: pick(
      row.defaultSeoDescription,
      SETTINGS_DEFAULTS.defaultSeoDescription
    ),
    socialLinks: parseSocial(row.socialLinks),
    portalEnabled: row.portalEnabled ?? false,
    portalLabel: pick(row.portalLabel, SETTINGS_DEFAULTS.portalLabel),
    portalUrl: row.portalUrl?.trim() ?? "",
    features: resolveFeatures(row.features),
  };
}

export async function getSettings(): Promise<ResolvedSettings> {
  try {
    const row = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
    });
    return resolveSettings(row);
  } catch {
    // A settings lookup must never be the reason a page 500s.
    return SETTINGS_DEFAULTS;
  }
}

/** `tel:` / `mailto:` hrefs — strips spaces the display value carries. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
