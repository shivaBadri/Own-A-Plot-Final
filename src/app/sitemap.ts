import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/ventures`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/plots`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const [projects, plots] = await Promise.all([
      prisma.project.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
      // Only AVAILABLE plots: a sold plot's page still resolves, but indexing it
      // sends search traffic to something that cannot be bought.
      prisma.plot.findMany({
        where: { status: "AVAILABLE", project: { isPublished: true } },
        select: { id: true, updatedAt: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...projects.map((project) => ({
        url: `${baseUrl}/ventures/${project.slug}`,
        lastModified: project.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...plots.map((plot) => ({
        url: `${baseUrl}/plots/${plot.id}`,
        lastModified: plot.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // A database blip must not take the sitemap down entirely.
    return staticRoutes;
  }
}
