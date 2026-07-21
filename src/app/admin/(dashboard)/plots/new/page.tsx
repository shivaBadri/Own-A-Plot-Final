import { prisma } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import PlotForm from "@/components/admin/PlotForm";
import { requirePageAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewPlotPage() {
  await requirePageAccess("plots:create");
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Plots"
        title="New plot"
        description="Only Available plots are shown to the public."
      />
      <PlotForm projects={projects} />
    </>
  );
}
