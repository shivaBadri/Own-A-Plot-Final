import { prisma } from "@/lib/db";
import { resolveSettings } from "@/lib/settings";
import PageHeader from "@/components/admin/PageHeader";
import SettingsForm from "@/components/admin/SettingsForm";
import { requirePageAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requirePageAccess("settings:view");
  const row = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Contact details, footer copy, social links, default SEO, the customer portal login, and the site Feature Manager."
      />
      <SettingsForm settings={resolveSettings(row)} />
    </>
  );
}
