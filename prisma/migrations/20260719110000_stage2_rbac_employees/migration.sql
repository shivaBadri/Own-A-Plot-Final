-- Stage 2 — Enterprise RBAC + employees.
--
-- Non-destructive. Every new column is nullable or has a default, so an
-- existing production database migrates without downtime and without a
-- backfill script.

-- 1. Roles ------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    CREATE TYPE "Role" AS ENUM (
      'SUPER_ADMIN',
      'ADMIN',
      'SALES_EXECUTIVE',
      'LAYOUT_DESIGNER',
      'MARKETING',
      'FINANCE',
      'CUSTOMER_SUPPORT'
    );
  END IF;
END
$$;

-- 2. Employee columns on Admin ----------------------------------------------
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "jobTitle" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "lastLoginIp" TEXT;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "permissionGrants" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "permissionRevokes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Anyone who already had an account predates roles entirely, which means they
-- were an unrestricted administrator. Promote them rather than silently
-- demoting them to the column default and locking the owner out of their own
-- employee module.
UPDATE "Admin" SET "role" = 'SUPER_ADMIN' WHERE "createdById" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Admin_createdById_fkey'
  ) THEN
    ALTER TABLE "Admin"
      ADD CONSTRAINT "Admin_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "Admin"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "Admin_role_idx" ON "Admin" ("role");
CREATE INDEX IF NOT EXISTS "Admin_isActive_idx" ON "Admin" ("isActive");
CREATE INDEX IF NOT EXISTS "Admin_createdAt_idx" ON "Admin" ("createdAt");

-- 3. Activity log -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id"         TEXT NOT NULL,
  "actorId"    TEXT,
  "actorName"  TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "actorRole"  "Role",
  "action"     TEXT NOT NULL,
  "entity"     TEXT NOT NULL,
  "entityId"   TEXT,
  "summary"    TEXT NOT NULL,
  "ip"         TEXT,
  "userAgent"  TEXT,
  "metadata"   JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ActivityLog_actorId_fkey'
  ) THEN
    ALTER TABLE "ActivityLog"
      ADD CONSTRAINT "ActivityLog_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "Admin"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_actorId_createdAt_idx" ON "ActivityLog" ("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "ActivityLog_entity_entityId_idx" ON "ActivityLog" ("entity", "entityId");
CREATE INDEX IF NOT EXISTS "ActivityLog_action_idx" ON "ActivityLog" ("action");
