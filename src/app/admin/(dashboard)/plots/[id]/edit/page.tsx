import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import PlotForm from "@/components/admin/PlotForm";
import { requirePageAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPlotPage({ params }: Props) {
  await requirePageAccess("plots:edit");
  const { id } = await params;

  const [plot, projects] = await Promise.all([
    prisma.plot.findUnique({
      where: { id },
      include: { project: { select: { name: true } } },
    }),
    prisma.project.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!plot) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Plots"
        title={`Plot ${plot.plotNumber}`}
        description={plot.project.name}
      />
      <PlotForm plot={plot} projects={projects} />
    </>
  );
}
