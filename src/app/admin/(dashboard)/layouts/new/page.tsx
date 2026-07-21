import { prisma } from "@/lib/db";
import { requirePageAccess } from "@/lib/guard";
import PageHeader from "@/components/admin/PageHeader";
import LayoutCreateForm from "@/components/admin/LayoutCreateForm";

export const dynamic = "force-dynamic";

export default async function NewLayoutPage() {
  await requirePageAccess("layouts:create");

  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Ventures"
        title="New layout"
        description="Upload the plan exactly as the architect exported it. Boundaries are drawn over it afterwards — the artwork is never altered."
      />
      <LayoutCreateForm projects={projects} />
    </>
  );
}
