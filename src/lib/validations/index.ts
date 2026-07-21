import { z } from "zod";

/**
 * Every write path -- API route and admin form alike -- validates through this
 * file. The JSON columns (advantages, details, landscape, nearby) are validated
 * structurally, not just as `unknown`; an admin cannot save a malformed row that
 * would later blow up a public page.
 */

const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .or(z.literal(""))
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

// ---------- JSON row shapes ----------

export const richRowSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  body: z.string().trim().default(""),
  image: z.string().trim().default(""),
});

export const detailRowSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  value: z.string().trim().default(""),
});

export const nearbyRowSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  distance: z.string().trim().default(""),
});

// ---------- Projects / Ventures ----------

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters"),
  location: z.string().trim().min(2, "Location is required"),
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED"]),
  amenities: z.array(z.string().trim().min(1)).default([]),
  isPublished: z.boolean().default(false),
  coverImage: optionalUrl,
  seoTitle: optionalText,
  seoDescription: optionalText,

  // Editorial
  tagline: optionalText,
  region: optionalText,
  totalAcres: z
    .number()
    .positive("Extent must be greater than zero")
    .nullable()
    .optional(),
  heroImage: optionalUrl,
  heroVideo: optionalUrl,
  accent: z.enum(["OLIVE", "EARTH", "BARK"]).default("OLIVE"),
  gallery: z.array(z.string().trim().url()).default([]),

  storyEyebrow: optionalText,
  storyTitle: optionalText,
  storyBody: z.array(z.string().trim().min(1)).default([]),

  advantages: z.array(richRowSchema).default([]),
  details: z.array(detailRowSchema).default([]),
  landscape: z.array(richRowSchema).default([]),
  nearby: z.array(nearbyRowSchema).default([]),

  address: optionalText,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  mapEmbed: optionalText,

  brochureUrl: optionalUrl,
  brochureFileName: optionalText,
  brochureFileSize: optionalText,

  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const projectUpdateSchema = projectSchema.partial();

// ---------- Plots ----------

export const plotSchema = z.object({
  plotNumber: z.string().trim().min(1, "Plot number is required"),
  sizeSqft: z.number().positive("Size must be greater than zero"),
  price: z.number().nonnegative("Price cannot be negative"),
  status: z.enum(["AVAILABLE", "RESERVED", "BOOKED", "SOLD", "BLOCKED"]),
  facing: optionalText,
  description: optionalText,
  dimensions: optionalText,
  priceOnRequest: z.boolean().default(false),
  projectId: z.string().trim().min(1, "A venture must be selected"),
});

export const plotUpdateSchema = plotSchema.partial();

/**
 * Bulk plot update from the admin plots table. `ids` is the selection; every
 * other field is an optional patch applied to all of them. At least one patch
 * field must be present, enforced in the route, so an empty apply is a no-op
 * rather than a silent full-table touch.
 */
export const plotBulkUpdateSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1, "Select at least one plot").max(500),
  status: z
    .enum(["AVAILABLE", "RESERVED", "BOOKED", "SOLD", "BLOCKED"])
    .optional(),
  priceOnRequest: z.boolean().optional(),
});

// ---------- Interactive master layout ----------

/** A single normalised polygon vertex. */
export const layoutPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const layoutShapeKindEnum = z.enum([
  "PLOT",
  "AMENITY",
  "ROAD",
  "PARK",
  "ENTRANCE",
  "OTHER",
]);

export const layoutShapeSchema = z.object({
  /** Present when updating an existing shape, absent when creating one. */
  id: z.string().trim().min(1).optional(),
  plotId: z.string().trim().min(1).nullable().optional(),
  kind: layoutShapeKindEnum.default("PLOT"),
  label: z.string().trim().max(120).optional().or(z.literal("")),
  /**
   * Three vertices minimum — two points is a line, and a line encloses no
   * plot. The 400 ceiling is a sanity bound: a hand-traced boundary is 4 to 12
   * points, and anything past a few hundred is a runaway drawing loop that
   * would bloat the JSON column and stall the SVG.
   */
  points: z.array(layoutPointSchema).min(3, "A boundary needs at least three points").max(400),
});

export const layoutCreateSchema = z.object({
  projectId: z.string().trim().min(1, "A venture must be selected"),
  name: z.string().trim().min(1, "Give the plan a name").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  imageUrl: z.string().trim().url("Upload or paste a layout image URL"),
  imageWidth: z.number().int().positive("Image width is required"),
  imageHeight: z.number().int().positive("Image height is required"),
  isPublished: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const layoutUpdateSchema = layoutCreateSchema.partial().omit({
  projectId: true,
});

/** Bulk save from the polygon editor — the whole shape set, in one write. */
export const layoutShapesSchema = z.object({
  shapes: z.array(layoutShapeSchema).max(2000),
});

// ---------- Enquiries ----------

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20),
  message: z.string().trim().max(2000).optional(),
  interest: z.string().trim().max(200).optional(),
  source: z.string().trim().max(200).optional(),
  projectId: optionalText,
  plotId: optionalText,
  /**
   * Honeypot. Real users never see this field, so anything in it is a bot.
   * Declared as "must be empty" so the route can 200 silently without writing.
   */
  company: z.string().max(0).optional(),
});

export const enquiryUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CLOSED"]).optional(),
  notes: z.string().trim().max(4000).optional(),
});

// ---------- Employees / RBAC ----------

export const roleEnum = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "SALES_EXECUTIVE",
  "LAYOUT_DESIGNER",
  "MARKETING",
  "FINANCE",
  "CUSTOMER_SUPPORT",
]);

/** `resource:action`. Validated against the real matrix in the API layer so a
 * typo cannot silently widen someone's access. */
const permissionString = z
  .string()
  .trim()
  .regex(/^[a-z]+:[a-z]+$/, "Permissions look like resource:action");

const employeeBase = {
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: roleEnum,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  avatarUrl: optionalUrl,
  permissionGrants: z.array(permissionString).max(120).default([]),
  permissionRevokes: z.array(permissionString).max(120).default([]),
};

export const employeeCreateSchema = z.object({
  ...employeeBase,
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(200),
  /** Force a password change on first sign-in. On by default, deliberately. */
  mustChangePassword: z.boolean().default(true),
});

export const employeeUpdateSchema = z
  .object({
    ...employeeBase,
    mustChangePassword: z.boolean(),
  })
  .partial();

export const employeePasswordResetSchema = z.object({
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(200),
  mustChangePassword: z.boolean().default(true),
});

export const activityQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  actorId: z.string().trim().max(60).optional(),
  action: z.string().trim().max(60).optional(),
  entity: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(30),
});

// ---------- Auth / Admin ----------

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    avatarUrl: optionalUrl,
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Enter your current password to set a new one",
    path: ["currentPassword"],
  });

// ---------- Settings ----------

export const siteSettingsSchema = z.object({
  siteName: z.string().trim().min(1, "Site name is required"),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .or(z.literal(""))
    .optional(),
  contactPhone: optionalText,
  address: optionalText,
  officeHours: optionalText,
  footerTagline: optionalText,
  defaultSeoTitle: optionalText,
  defaultSeoDescription: optionalText,
  socialLinks: z
    .object({
      facebook: optionalUrl,
      instagram: optionalUrl,
      twitter: optionalUrl,
      linkedin: optionalUrl,
      youtube: optionalUrl,
    })
    .partial()
    .optional(),

  // Customer / partner portal (Stage 2 — "Portal Login" in Settings).
  portalEnabled: z.boolean().default(false),
  portalLabel: z.string().trim().max(40).optional().or(z.literal("")),
  portalUrl: optionalUrl,

  // Feature Manager (Stage 4). A flat boolean map; keys are validated against
  // the real registry in the API layer, so a stray key cannot be persisted.
  features: z.record(z.string(), z.boolean()).optional(),
});

// ---------- CMS ----------

export const cmsSchema = z.object({
  key: z.string().trim().min(1),
  content: z.record(z.string(), z.unknown()),
});

// ---------- Media ----------

export const mediaUpdateSchema = z.object({
  alt: z.string().trim().max(300).optional(),
});

// ---------- Query params ----------

/** Shared list-query parser. Coerces URL strings and clamps `perPage`. */
export const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().max(40).optional(),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type LayoutShapeInput = z.infer<typeof layoutShapeSchema>;
export type LayoutCreateInput = z.infer<typeof layoutCreateSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type PlotInput = z.infer<typeof plotSchema>;
export type EnquiryInput = z.infer<typeof enquirySchema>;
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
