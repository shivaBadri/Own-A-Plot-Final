import { unstable_cache, revalidateTag } from "next/cache";
import { cache } from "react";
import { prisma } from "@/lib/db";

/**
 * Two different caches, doing two different jobs.
 *
 * `cache()` from React dedupes within a SINGLE render pass — a layout and a
 * page that both need the signed-in employee cause one query, not two.
 *
 * `unstable_cache()` persists ACROSS requests and is keyed by tag, so the
 * sidebar's enquiry badge and the venture <select> options stop hitting
 * Postgres on every admin navigation. Every write path that could invalidate
 * them calls the matching `revalidate*` helper below, so the cache is never
 * the reason an admin sees stale data after their own edit.
 */

export const CACHE_TAGS = {
  enquiries: "enquiries",
  projects: "projects",
  plots: "plots",
  settings: "settings",
  cms: "cms",
  employees: "employees",
  layouts: "layouts",
} as const;

/** Ventures reduced to the shape every <select> in the admin needs. */
export const getProjectOptions = unstable_cache(
  async () =>
    prisma.project.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ["admin:project-options"],
  { tags: [CACHE_TAGS.projects], revalidate: 300 }
);

/** Unread-enquiry count for the sidebar badge. Rendered on every admin page. */
export const getNewEnquiryCount = unstable_cache(
  async () => prisma.enquiry.count({ where: { status: "NEW" } }),
  ["admin:new-enquiry-count"],
  { tags: [CACHE_TAGS.enquiries], revalidate: 60 }
);

export function revalidateProjects() {
  revalidateTag(CACHE_TAGS.projects);
}

export function revalidatePlots() {
  revalidateTag(CACHE_TAGS.plots);
}

export function revalidateEnquiries() {
  revalidateTag(CACHE_TAGS.enquiries);
}

export function revalidateSettings() {
  revalidateTag(CACHE_TAGS.settings);
}

export function revalidateCms() {
  revalidateTag(CACHE_TAGS.cms);
}

export function revalidateEmployees() {
  revalidateTag(CACHE_TAGS.employees);
}

export function revalidateLayouts() {
  revalidateTag(CACHE_TAGS.layouts);
}

/**
 * Request-scoped venture lookup used by both the public venture page and its
 * `generateMetadata`. Without `cache()` those are two identical queries per
 * page view — the most expensive duplicate in the whole app, because the
 * include pulls every plot.
 */
export const getPublishedProjectBySlug = cache(async (slug: string) =>
  prisma.project.findFirst({
    where: { slug, isPublished: true },
    include: {
      plots: { orderBy: [{ status: "asc" }, { plotNumber: "asc" }] },
      /**
       * Published master layouts, with their polygons and each polygon's plot.
       *
       * Loaded in the SAME query as the venture rather than a second round
       * trip: the layout section sits mid-page, and a separate fetch would
       * either block the whole render or pop in after the reader has already
       * scrolled past it.
       */
      layouts: {
        where: { isPublished: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          shapes: {
            include: {
              plot: {
                select: {
                  id: true,
                  plotNumber: true,
                  sizeSqft: true,
                  dimensions: true,
                  facing: true,
                  price: true,
                  priceOnRequest: true,
                  status: true,
                  description: true,
                },
              },
            },
          },
        },
      },
    },
  })
);
