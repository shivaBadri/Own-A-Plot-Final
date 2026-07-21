import { prisma } from "@/lib/db";

/**
 * The CMS is a key -> JSON store. Left untyped, it becomes a place where a
 * typo in the admin silently blanks a homepage section.
 *
 * So: every section is declared once here, with a type, a field schema the
 * admin UI renders from, and a DEFAULT taken verbatim from the approved
 * frontend copy. Public pages read through `getCms()`, which merges DB content
 * over the defaults. Net effect — an empty database renders the approved site
 * exactly as designed, and the CMS only ever overrides.
 */

export interface HeroContent {
  image: string;
  title: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export interface HomeAboutContent {
  eyebrow: string;
  title: string;
  image: string;
  body: string[];
  ctaLabel: string;
  ctaHref: string;
}

export interface FeaturedContent {
  eyebrow: string;
  title: string;
  linkLabel: string;
}

export interface WhyItem {
  icon: WhyIcon;
  title: string;
  body: string;
}

export type WhyIcon = "shield" | "file" | "sprout" | "message";

export interface WhyContent {
  eyebrow: string;
  items: WhyItem[];
}

export interface QuoteContent {
  eyebrow: string;
  quote: string;
  attribution: string;
  image: string;
}

export interface AboutPageContent {
  eyebrow: string;
  title: string;
  intro: string;
  splitEyebrow: string;
  splitTitle: string;
  splitImage: string;
  splitBody: string[];
  principlesEyebrow: string;
  principlesTitle: string;
  principles: { n: string; title: string; body: string }[];
  quote: string;
  quoteAttribution: string;
  quoteImage: string;
  ctaLabel: string;
}

export interface ContactPageContent {
  eyebrow: string;
  title: string;
  intro: string;
  visitNoteTitle: string;
  visitNoteBody: string;
}

export interface VenturesPageContent {
  eyebrow: string;
  title: string;
  intro: string;
}

export interface PlotsPageContent {
  eyebrow: string;
  title: string;
  intro: string;
}

export interface CmsShape {
  hero: HeroContent;
  homeAbout: HomeAboutContent;
  featured: FeaturedContent;
  why: WhyContent;
  quote: QuoteContent;
  aboutPage: AboutPageContent;
  contactPage: ContactPageContent;
  venturesPage: VenturesPageContent;
  plotsPage: PlotsPageContent;
}

export type CmsKey = keyof CmsShape;

export const CMS_DEFAULTS: CmsShape = {
  hero: {
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2600&auto=format&fit=crop",
    title: "Own A Plot",
    primaryLabel: "Explore Ventures",
    primaryHref: "/ventures",
    secondaryLabel: "Contact",
    secondaryHref: "/contact",
  },
  homeAbout: {
    eyebrow: "About Own A Plot",
    title: "We make land ownership simple, transparent, and meaningful.",
    image:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1800&auto=format&fit=crop",
    body: [
      "Own A Plot is a small, careful company that curates managed land ventures. Every venture we open is one we would put our own family on.",
      "We spend a long time on each parcel — walking it, listening to it, drawing and re-drawing — until the land tells us how it wants to be lived on. Then, we open it, quietly.",
      "The result: not a marketplace, but a small library of places that will grow more valuable, more beautiful, and more useful over time.",
    ],
    ctaLabel: "Our Approach",
    ctaHref: "/about",
  },
  featured: {
    eyebrow: "Featured Ventures",
    title: "A small library of places, held with intention.",
    linkLabel: "View All Ventures →",
  },
  why: {
    eyebrow: "Why Own A Plot",
    items: [
      {
        icon: "shield",
        title: "Verified Ventures",
        body: "Every parcel is independently walked, verified, and legally reviewed before it is opened.",
      },
      {
        icon: "file",
        title: "Clear Documentation",
        body: "Single-owner titles, DTCP approvals, and a straight, transparent path to your name on paper.",
      },
      {
        icon: "sprout",
        title: "Growing Locations",
        body: "We choose corridors that are quietly improving — not markets that are already loud.",
      },
      {
        icon: "message",
        title: "Easy Enquiry",
        body: "A small team, a quiet call, and a walk of the land with no pressure — that is the process.",
      },
    ],
  },
  quote: {
    eyebrow: "In Closing",
    quote:
      "Land does not appreciate on a graph. It appreciates in the way you feel when you stand on it, twenty years from now.",
    attribution: "— Founder's Note",
    image:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1600&auto=format&fit=crop",
  },
  aboutPage: {
    eyebrow: "Our Approach",
    title: "A quieter, more considered way of owning land.",
    intro:
      "Own A Plot is a small team of planners, agronomists, and lawyers who curate managed land ventures for people who want to own the future — slowly, thoughtfully, and on their own terms.",
    splitEyebrow: "Why We Do This",
    splitTitle:
      "Because land, done well, is the most patient investment there is.",
    splitImage:
      "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?q=80&w=1800&auto=format&fit=crop",
    splitBody: [
      "We began Own A Plot after a decade of watching the land business grow crowded and loud. Too many logos. Too many promises. Not enough people who had actually walked the ground they were selling.",
      "So we set a rule for ourselves. We would only ever open a venture that a member of our own family would want to hold. We would talk about it plainly. We would draw it carefully. And we would keep the number small.",
      "Everything else follows from that.",
    ],
    principlesEyebrow: "Principles",
    principlesTitle: "The four we live by.",
    principles: [
      {
        n: "01",
        title: "Walk the land, first.",
        body: "No parcel enters the collection without at least three visits, in three seasons, by two members of the team.",
      },
      {
        n: "02",
        title: "Draw with the land, not against it.",
        body: "Roads follow contours. Trees stay where they are. Plots face the sky the land already had.",
      },
      {
        n: "03",
        title: "Talk plainly, always.",
        body: "The paperwork you sign says what it means. The brochure shows what you will see. No small print.",
      },
      {
        n: "04",
        title: "Keep the number small.",
        body: "We open only a handful of ventures each year. It is the only way to hold to the first three principles.",
      },
    ],
    quote:
      "A good piece of land does not ask to be sold. It asks to be understood, and then, quietly, to be kept.",
    quoteAttribution: "— Founder's Note",
    quoteImage:
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1600&auto=format&fit=crop",
    ctaLabel: "See the Collection",
  },
  contactPage: {
    eyebrow: "Contact",
    title: "Begin a quiet conversation.",
    intro:
      "Share a few details and a member of the team will call you back within one working day.",
    visitNoteTitle: "A Note on Visits",
    visitNoteBody:
      "Visits to our ventures are private, unhurried, and only ever by appointment. We prefer it that way — and, we suspect, so will you.",
  },
  venturesPage: {
    eyebrow: "The Collection",
    title: "A small library of places, held with intention.",
    intro:
      "We open only a handful of ventures each year. Each is walked, reviewed, and drawn until the land settles into its own quiet proportion.",
  },
  plotsPage: {
    eyebrow: "Available Plots",
    title: "Every plot, and the ground it sits on.",
    intro:
      "Each plot below belongs to an open venture. Sizes, orientation, and extent are listed plainly; price is shared on enquiry where the venture calls for it.",
  },
};

/** Field descriptors the admin CMS page renders its forms from. */
export type CmsFieldType = "text" | "textarea" | "image" | "list" | "richlist";

export interface CmsFieldDef {
  name: string;
  label: string;
  type: CmsFieldType;
  hint?: string;
  /** For `richlist` — which keys each row carries. */
  rowKeys?: { name: string; label: string; type?: "text" | "textarea" | "image" }[];
}

export interface CmsSectionDef {
  key: CmsKey;
  label: string;
  description: string;
  fields: CmsFieldDef[];
}

export const CMS_SECTIONS: CmsSectionDef[] = [
  {
    key: "hero",
    label: "Homepage — Hero",
    description: "The full-height opening image and title.",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "image", label: "Hero image URL", type: "image" },
      { name: "primaryLabel", label: "Primary button label", type: "text" },
      { name: "primaryHref", label: "Primary button link", type: "text" },
      { name: "secondaryLabel", label: "Secondary button label", type: "text" },
      { name: "secondaryHref", label: "Secondary button link", type: "text" },
    ],
  },
  {
    key: "homeAbout",
    label: "Homepage — About split",
    description: "The editorial image-and-text block below the hero.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "image", label: "Image URL", type: "image" },
      {
        name: "body",
        label: "Paragraphs",
        type: "list",
        hint: "One paragraph per line.",
      },
      { name: "ctaLabel", label: "Button label", type: "text" },
      { name: "ctaHref", label: "Button link", type: "text" },
    ],
  },
  {
    key: "featured",
    label: "Homepage — Featured ventures",
    description:
      "Heading above the featured grid. The ventures themselves come from Projects marked Featured.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "linkLabel", label: "Link label", type: "text" },
    ],
  },
  {
    key: "why",
    label: "Homepage — Why Own A Plot",
    description: "The four-card value grid.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      {
        name: "items",
        label: "Cards",
        type: "richlist",
        hint: "Icon must be one of: shield, file, sprout, message.",
        rowKeys: [
          { name: "icon", label: "Icon" },
          { name: "title", label: "Title" },
          { name: "body", label: "Body", type: "textarea" },
        ],
      },
    ],
  },
  {
    key: "quote",
    label: "Homepage — Closing quote",
    description: "The founder's note that closes the homepage.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "quote", label: "Quote", type: "textarea" },
      { name: "attribution", label: "Attribution", type: "text" },
      { name: "image", label: "Image URL", type: "image" },
    ],
  },
  {
    key: "venturesPage",
    label: "Ventures page — Header",
    description: "Copy at the top of the ventures listing.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "intro", label: "Intro", type: "textarea" },
    ],
  },
  {
    key: "plotsPage",
    label: "Plots page — Header",
    description: "Copy at the top of the plots listing.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "intro", label: "Intro", type: "textarea" },
    ],
  },
  {
    key: "aboutPage",
    label: "About page",
    description: "Every editable block on /about.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "intro", label: "Intro", type: "textarea" },
      { name: "splitEyebrow", label: "Split — eyebrow", type: "text" },
      { name: "splitTitle", label: "Split — title", type: "text" },
      { name: "splitImage", label: "Split — image URL", type: "image" },
      {
        name: "splitBody",
        label: "Split — paragraphs",
        type: "list",
        hint: "One paragraph per line.",
      },
      { name: "principlesEyebrow", label: "Principles — eyebrow", type: "text" },
      { name: "principlesTitle", label: "Principles — title", type: "text" },
      {
        name: "principles",
        label: "Principles",
        type: "richlist",
        rowKeys: [
          { name: "n", label: "Number" },
          { name: "title", label: "Title" },
          { name: "body", label: "Body", type: "textarea" },
        ],
      },
      { name: "quote", label: "Closing quote", type: "textarea" },
      { name: "quoteAttribution", label: "Quote attribution", type: "text" },
      { name: "quoteImage", label: "Quote image URL", type: "image" },
      { name: "ctaLabel", label: "Closing button label", type: "text" },
    ],
  },
  {
    key: "contactPage",
    label: "Contact page",
    description:
      "Copy on /contact. Phone, email, and address come from Settings, not here.",
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "intro", label: "Intro", type: "textarea" },
      { name: "visitNoteTitle", label: "Visit note — title", type: "text" },
      { name: "visitNoteBody", label: "Visit note — body", type: "textarea" },
    ],
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Shallow-merges stored content over the default, key by key. A stored key is
 * only allowed to win if it is non-empty and of the same broad shape as the
 * default — an empty string or a stray null falls back rather than blanking
 * the section.
 */
function merge<T extends object>(fallback: T, stored: unknown): T {
  if (!isRecord(stored)) return fallback;
  const out = { ...fallback } as Record<string, unknown>;

  for (const [key, fallbackValue] of Object.entries(fallback)) {
    const value = stored[key];
    if (value === undefined || value === null) continue;

    if (Array.isArray(fallbackValue)) {
      if (Array.isArray(value) && value.length > 0) out[key] = value;
      continue;
    }
    if (typeof fallbackValue === "string") {
      if (typeof value === "string" && value.trim() !== "") out[key] = value;
      continue;
    }
    out[key] = value;
  }

  return out as T;
}

/**
 * Loads every CMS section in one query and returns a fully-populated, typed
 * object. Pages destructure what they need; nothing can be undefined.
 */
export async function getCms(): Promise<CmsShape> {
  const rows = await prisma.cmsSection.findMany();
  const byKey = new Map(rows.map((row) => [row.key, row.content]));

  return {
    hero: merge(CMS_DEFAULTS.hero, byKey.get("hero")),
    homeAbout: merge(CMS_DEFAULTS.homeAbout, byKey.get("homeAbout")),
    featured: merge(CMS_DEFAULTS.featured, byKey.get("featured")),
    why: merge(CMS_DEFAULTS.why, byKey.get("why")),
    quote: merge(CMS_DEFAULTS.quote, byKey.get("quote")),
    aboutPage: merge(CMS_DEFAULTS.aboutPage, byKey.get("aboutPage")),
    contactPage: merge(CMS_DEFAULTS.contactPage, byKey.get("contactPage")),
    venturesPage: merge(CMS_DEFAULTS.venturesPage, byKey.get("venturesPage")),
    plotsPage: merge(CMS_DEFAULTS.plotsPage, byKey.get("plotsPage")),
  };
}

/** Single-section variant, for pages that only need one block. */
export async function getCmsSection<K extends CmsKey>(
  key: K
): Promise<CmsShape[K]> {
  const row = await prisma.cmsSection.findUnique({ where: { key } });
  return merge(CMS_DEFAULTS[key] as object, row?.content) as CmsShape[K];
}
