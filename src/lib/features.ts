/**
 * Feature Manager (Stage 4).
 *
 * A small, typed registry of toggles that gate optional public-site behaviour.
 * The flags live in `SiteSettings.features` (a JSON column) so an operator can
 * turn a capability on or off from the admin without a deploy, and a new flag
 * can be added here without another migration.
 *
 * The registry is the single source of truth: the admin Feature Manager renders
 * from it, the resolver falls back to the default declared here for any key the
 * stored row is missing, and the public site reads the resolved booleans. An
 * unknown key in the database is ignored rather than trusted.
 */

export type FeatureKey =
  | "interactiveLayout"
  | "plotSearch"
  | "layoutAutoZoom"
  | "brochureLayoutPreview"
  | "portalLogin";

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  /** Shipped default when the operator has never touched the flag. */
  default: boolean;
}

/** Order here is the order the admin Feature Manager renders. */
export const FEATURE_DEFINITIONS: readonly FeatureDefinition[] = [
  {
    key: "interactiveLayout",
    label: "Interactive master layout",
    description:
      "Show the zoomable, clickable master-layout plan on venture pages. Turning this off hides the plan entirely.",
    default: true,
  },
  {
    key: "plotSearch",
    label: "Plot search on the layout",
    description:
      "Let visitors search the layout by plot number, area, facing, price or status and jump straight to the plot.",
    default: true,
  },
  {
    key: "layoutAutoZoom",
    label: "Auto-zoom to selected plot",
    description:
      "When a plot is selected — by tap or from search — smoothly frame it in the viewport.",
    default: true,
  },
  {
    key: "brochureLayoutPreview",
    label: "Layout preview in brochure card",
    description:
      "Show a small preview of the master layout inside the brochure card, above the download.",
    default: true,
  },
  {
    key: "portalLogin",
    label: "Portal login button",
    description:
      "Show the customer/partner portal login button in the navigation. Also requires a portal URL in Settings.",
    default: false,
  },
] as const;

export type Features = Record<FeatureKey, boolean>;

export const FEATURE_DEFAULTS: Features = FEATURE_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.key] = def.default;
    return acc;
  },
  {} as Features
);

const FEATURE_KEYS = new Set<string>(FEATURE_DEFINITIONS.map((d) => d.key));

/**
 * Coerces whatever is in the JSON column into a full, typed feature set.
 * Missing keys take their shipped default; unknown keys are dropped; a
 * non-object (null, array, string) resolves to all-defaults.
 */
export function resolveFeatures(value: unknown): Features {
  const resolved: Features = { ...FEATURE_DEFAULTS };
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return resolved;
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (FEATURE_KEYS.has(key) && typeof record[key] === "boolean") {
      resolved[key as FeatureKey] = record[key] as boolean;
    }
  }
  return resolved;
}
