import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { handleApiError, unauthorized, forbidden } from "@/lib/api-utils";
import type { DashboardStats } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("dashboard:view");
  if (!guard.ok) return guard.status === 401 ? unauthorized() : forbidden();

  try {
    const [
      totalProjects,
      publishedProjects,
      totalPlots,
      plotsAvailable,
      plotsReserved,
      plotsSold,
      newEnquiries,
      totalEnquiries,
      totalMedia,
      soldAggregate,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { isPublished: true } }),
      prisma.plot.count(),
      prisma.plot.count({ where: { status: "AVAILABLE" } }),
      prisma.plot.count({ where: { status: "RESERVED" } }),
      prisma.plot.count({ where: { status: { in: ["SOLD", "BOOKED"] } } }),
      prisma.enquiry.count({ where: { status: "NEW" } }),
      prisma.enquiry.count(),
      prisma.media.count(),
      prisma.plot.aggregate({
        // Booked money is committed money — a plan that counts only SOLD
      // understates the position by an entire pipeline stage.
      where: { status: { in: ["SOLD", "BOOKED"] }, priceOnRequest: false },
        _sum: { price: true },
      }),
    ]);

    const stats: DashboardStats = {
      totalProjects,
      publishedProjects,
      totalPlots,
      plotsAvailable,
      plotsReserved,
      plotsSold,
      newEnquiries,
      totalEnquiries,
      totalMedia,
      soldValue: soldAggregate._sum.price ?? 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
