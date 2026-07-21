-- Stage 1 — performance indexes.
--
-- Every index below backs an ORDER BY or WHERE that the admin runs on a page
-- load, not a hypothetical future query. `IF NOT EXISTS` keeps the migration
-- safe to re-run and safe on a database where someone already added one by
-- hand.

-- Project ------------------------------------------------------------------
-- Admin venture list: ORDER BY "sortOrder" ASC, "updatedAt" DESC
CREATE INDEX IF NOT EXISTS "Project_sortOrder_updatedAt_idx"
  ON "Project" ("sortOrder", "updatedAt");
-- Every venture <select> in the admin: ORDER BY name ASC
CREATE INDEX IF NOT EXISTS "Project_name_idx" ON "Project" ("name");
CREATE INDEX IF NOT EXISTS "Project_createdAt_idx" ON "Project" ("createdAt");

-- Plot ---------------------------------------------------------------------
-- Admin plots table paging: WHERE "projectId" = ? ORDER BY "plotNumber"
CREATE INDEX IF NOT EXISTS "Plot_projectId_plotNumber_idx"
  ON "Plot" ("projectId", "plotNumber");
-- Public plot filters sort on price and size.
CREATE INDEX IF NOT EXISTS "Plot_price_idx" ON "Plot" ("price");
CREATE INDEX IF NOT EXISTS "Plot_sizeSqft_idx" ON "Plot" ("sizeSqft");
CREATE INDEX IF NOT EXISTS "Plot_createdAt_idx" ON "Plot" ("createdAt");

-- Enquiry ------------------------------------------------------------------
-- The enquiries list is WHERE status = ? ORDER BY "createdAt" DESC. A single
-- composite serves both halves; the two single-column indexes could not.
CREATE INDEX IF NOT EXISTS "Enquiry_status_createdAt_idx"
  ON "Enquiry" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Enquiry_projectId_idx" ON "Enquiry" ("projectId");
CREATE INDEX IF NOT EXISTS "Enquiry_plotId_idx" ON "Enquiry" ("plotId");

-- Media --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "Media_plotId_idx" ON "Media" ("plotId");
CREATE INDEX IF NOT EXISTS "Media_kind_createdAt_idx"
  ON "Media" ("kind", "createdAt");
