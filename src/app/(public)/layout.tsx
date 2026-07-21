import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import Reveal from "@/components/public/Reveal";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { toVentures } from "@/lib/content";

export const dynamic = "force-dynamic";

/**
 * The public shell. Navbar and Footer both need the live venture list and the
 * site settings, so they are fetched once here rather than in every page.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [projects, settings] = await Promise.all([
    prisma.project.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
    getSettings(),
  ]);

  const ventures = toVentures(projects);

  const navVentures = ventures.map((v) => ({
    slug: v.slug,
    name: v.name,
    location: v.location,
    heroImage: v.heroImage,
  }));

  const footerVentures = ventures
    .slice(0, 5)
    .map((v) => ({ slug: v.slug, name: v.name }));

  // The portal button appears only when the operator enabled it, set a URL,
  // AND left the feature on. Any one missing hides it — no dead links.
  const portal =
    settings.features.portalLogin &&
    settings.portalEnabled &&
    settings.portalUrl
      ? { label: settings.portalLabel, url: settings.portalUrl }
      : null;

  return (
    <>
      <Navbar
        ventures={navVentures}
        siteName={settings.siteName}
        portal={portal}
      />
      <Reveal>
        <main>{children}</main>
      </Reveal>
      <Footer ventures={footerVentures} settings={settings} />
    </>
  );
}
