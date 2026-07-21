import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatBytes, formatDate } from "@/lib/format";
import PageHeader from "@/components/admin/PageHeader";
import SearchBar from "@/components/admin/SearchBar";
import AdminPagination from "@/components/admin/AdminPagination";
import MediaLibrary from "@/components/admin/MediaLibrary";
import { requirePageAccess } from "@/lib/guard";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

interface Props {
  searchParams: Promise<{ q?: string; kind?: string; page?: string }>;
}

export default async function AdminMediaPage({ searchParams }: Props) {
  await requirePageAccess("media:view");
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.MediaWhereInput = {};
  if (params.kind === "IMAGE" || params.kind === "RAW") where.kind = params.kind;
  if (q) {
    where.OR = [
      { fileName: { contains: q, mode: "insensitive" } },
      { alt: { contains: q, mode: "insensitive" } },
    ];
  }

  const [media, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.media.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        eyebrow="Assets"
        title="Media library"
        description="Everything uploaded to Cloudinary. Deleting here removes the file from Cloudinary too."
      />

      <SearchBar
        placeholder="Search by filename or alt text"
        total={total}
        filters={[
          {
            name: "kind",
            label: "Type",
            options: [
              { value: "", label: "All" },
              { value: "IMAGE", label: "Images" },
              { value: "RAW", label: "PDFs" },
            ],
          },
        ]}
      />

      <MediaLibrary
        items={media.map((item) => ({
          id: item.id,
          url: item.url,
          alt: item.alt,
          kind: item.kind,
          fileName: item.fileName,
          size: formatBytes(item.bytes),
          dimensions:
            item.width && item.height ? `${item.width} × ${item.height}` : null,
          createdAt: formatDate(item.createdAt),
        }))}
        isFiltered={Boolean(q || params.kind)}
      />

      <AdminPagination page={page} totalPages={totalPages} />
    </>
  );
}
