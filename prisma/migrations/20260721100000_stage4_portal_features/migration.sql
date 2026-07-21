-- Stage 4 — Customer portal login + Feature Manager.
--
-- Non-destructive. Every column is nullable or carries a default, so an
-- existing production database migrates with no downtime and no backfill.

-- Customer / partner portal, surfaced as the public navbar "Login" button.
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "portalLabel" TEXT DEFAULT 'Login';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "portalUrl" TEXT;

-- Feature Manager flags. JSON so new toggles need no further migration.
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "features" JSONB;
