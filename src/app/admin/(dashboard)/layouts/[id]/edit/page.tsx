import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePageAccess } from "@/lib/guard";
import { parsePoints, type PlotStatus } from "@/lib/layout";
import PageHeader from "@/components/admin/PageHeader";
import LayoutEditor from "@/components/admin/LayoutEditor";
import LayoutPublishControls from "@/components/admin/LayoutPublishControls";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditLayoutPage({ params }: Props) {
  const user = await requirePageAccess("layouts:view");
  const { id } = await params;

  const layout = await prisma.layout.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, slug: true, isPublished: true } },
      shapes: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!layout) notFound();

  /**
   * The plot list is read HERE, under `layouts:view`, rather than through the
   * plots module. A Layout Designer has no `plots:view` permission by policy,
   * but cannot bind a boundary to a plot without seeing the plot numbers —
   * so the layout module serves its own, scoped to this venture only.
   */
  const plots = await prisma.plot.findMany({
    where: { projectId: layout.projectId },
    select: { id: true, plotNumber: true, status: true },
    orderBy: { plotNumber: "asc" },
  });

  const canEdit = user.permissions.has("layouts:edit");

  return (
    <>
      <PageHeader
        eyebrow={layout.project.name}
        title={layout.name}
        description={
          canEdit
            ? "Trace each plot boundary and attach it to its record. Colours come from plot status, so the plan stays correct as inventory moves."
            : "Read only — your role can view layouts but not change them."
        }
      />

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <LayoutPublishControls
          layoutId={layout.id}
          isPublished={layout.isPublished}
          canPublish={user.permissions.has("layouts:publish")}
          canDelete={user.permissions.has("layouts:delete")}
          shapeCount={layout.shapes.length}
        />

        {layout.project.isPublished && (
          <Link
            href={`/ventures/${layout.project.slug}#master-layout`}
            target="_blank"
            className="btn-admin-ghost"
          >
            <ExternalLink size={13} strokeWidth={1.5} />
            Preview on site
          </Link>
        )}
      </div>

      <LayoutEditor
        layoutId={layout.id}
        imageUrl={layout.imageUrl}
        imageWidth={layout.imageWidth}
        imageHeight={layout.imageHeight}
        plots={plots.map((plot) => ({
          ...plot,
          status: plot.status as PlotStatus,
        }))}
        initialShapes={layout.shapes.map((shape) => ({
          id: shape.id,
          plotId: shape.plotId,
          kind: shape.kind,
          label: shape.label,
          points: parsePoints(shape.points),
        }))}
        canEdit={canEdit}
      />
    </>
  );
}
