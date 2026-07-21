import PageHeader from "@/components/admin/PageHeader";
import ProjectForm from "@/components/admin/ProjectForm";
import { requirePageAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requirePageAccess("ventures:create");

  return (
    <>
      <PageHeader
        eyebrow="Ventures"
        title="New venture"
        description="It stays invisible to the public until you publish it."
      />
      <ProjectForm />
    </>
  );
}
