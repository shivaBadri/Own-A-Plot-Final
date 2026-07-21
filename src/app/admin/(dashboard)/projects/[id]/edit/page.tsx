import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PageHeader from "@/components/admin/PageHeader";
import ProjectForm from "@/components/admin/ProjectForm";
import { requirePageAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({ params }: Props) {
  await requirePageAccess("ventures:edit");
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Ventures"
        title={project.name}
        description={
          project.isPublished
            ? "Live on the site. Changes appear immediately."
            : "Draft — not visible to the public."
        }
      />
      <ProjectForm project={project} />
    </>
  );
}
