import { prisma } from "@/lib/db";
import { CMS_SECTIONS, CMS_DEFAULTS, type CmsKey } from "@/lib/cms";
import PageHeader from "@/components/admin/PageHeader";
import CmsSectionEditor from "@/components/admin/CmsSectionEditor";
import { requirePageAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

/**
 * Every editable block on the public site, in one place.
 *
 * The original CMS page exposed exactly two fields — a headline and a
 * subheadline — while the approved frontend has dozens of pieces of copy. The
 * section list is generated from CMS_SECTIONS, so adding a block to the site
 * adds it here automatically; the two cannot drift apart.
 */
export default async function AdminCmsPage() {
  await requirePageAccess("cms:view");
  const rows = await prisma.cmsSection.findMany();
  const byKey = new Map(rows.map((row) => [row.key, row.content]));

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Site content"
        description="Copy and imagery for the homepage and the standing pages. Ventures and plots are edited under their own sections."
      />

      <div className="mt-10 space-y-6">
        {CMS_SECTIONS.map((section) => (
          <CmsSectionEditor
            key={section.key}
            section={section}
            initialContent={
              (byKey.get(section.key) as Record<string, unknown>) ?? {}
            }
            defaults={
              CMS_DEFAULTS[section.key as CmsKey] as unknown as Record<
                string,
                unknown
              >
            }
          />
        ))}
      </div>
    </>
  );
}
