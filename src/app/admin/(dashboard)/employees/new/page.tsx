import { requirePageAccess } from "@/lib/guard";
import PageHeader from "@/components/admin/PageHeader";
import EmployeeForm from "@/components/admin/EmployeeForm";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const user = await requirePageAccess("employees:create");

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="New employee"
        description="Pick a role first — the permission grid below fills itself in, and you only touch it for genuine exceptions."
      />

      <EmployeeForm
        actorPermissions={[...user.permissions]}
        actorIsSuperAdmin={user.role === "SUPER_ADMIN"}
        isSelf={false}
        canDelete={false}
      />
    </>
  );
}
