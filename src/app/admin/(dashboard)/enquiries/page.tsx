import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import PageHeader from "@/components/admin/PageHeader";
import SearchBar from "@/components/admin/SearchBar";
import AdminPagination from "@/components/admin/AdminPagination";
import EmptyState from "@/components/admin/EmptyState";
import EnquiryRow from "@/components/admin/EnquiryRow";
import { requirePageAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

interface Props {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function AdminEnquiriesPage({ searchParams }: Props) {
  await requirePageAccess("enquiries:view");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.EnquiryWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { interest: { contains: q, mode: "insensitive" } },
    ];
  }
  if (
    params.status === "NEW" ||
    params.status === "CONTACTED" ||
    params.status === "CLOSED"
  ) {
    where.status = params.status;
  }

  const [enquiries, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      include: { project: true, plot: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.enquiry.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const isFiltered = Boolean(q || params.status);

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Enquiries"
        description="Every callback request from the site. Expand a row to read the message and leave a note."
      />

      <SearchBar
        placeholder="Search by name, email, phone"
        total={total}
        filters={[
          {
            name: "status",
            label: "Status",
            options: [
              { value: "", label: "Any" },
              { value: "NEW", label: "New" },
              { value: "CONTACTED", label: "Contacted" },
              { value: "CLOSED", label: "Closed" },
            ],
          },
        ]}
      />

      {enquiries.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={isFiltered ? "Nothing matches that." : "No enquiries yet."}
            body={
              isFiltered
                ? "Try a different search, or clear the filters."
                : "Enquiries from the contact page, venture pages, and plot pages all land here."
            }
          />
        </div>
      ) : (
        <>
          <ul className="mt-10 divide-y divide-charcoal/10 border-y border-charcoal/10">
            {enquiries.map((enquiry) => (
              <EnquiryRow
                key={enquiry.id}
                enquiry={{
                  id: enquiry.id,
                  name: enquiry.name,
                  email: enquiry.email,
                  phone: enquiry.phone,
                  message: enquiry.message,
                  interest: enquiry.interest,
                  source: enquiry.source,
                  notes: enquiry.notes,
                  status: enquiry.status,
                  createdAt: formatDateTime(enquiry.createdAt),
                  projectName: enquiry.project?.name ?? null,
                  plotNumber: enquiry.plot?.plotNumber ?? null,
                }}
              />
            ))}
          </ul>

          <AdminPagination page={page} totalPages={totalPages} />
        </>
      )}
    </>
  );
}
