-- Stage 3 — interactive master layout.
--
-- Non-destructive. No existing column is dropped or retyped and no existing
-- plot changes status.

-- 1. Two new plot states ----------------------------------------------------
--
-- PostgreSQL 12+ permits ALTER TYPE ... ADD VALUE inside a transaction as long
-- as the new label is not USED in that same transaction. Nothing below writes
-- a BOOKED or BLOCKED row, so this is safe under Prisma's transactional
-- migration runner. `IF NOT EXISTS` keeps it re-runnable.
ALTER TYPE "PlotStatus" ADD VALUE IF NOT EXISTS 'BOOKED' AFTER 'RESERVED';
ALTER TYPE "PlotStatus" ADD VALUE IF NOT EXISTS 'BLOCKED' AFTER 'SOLD';

-- 2. Plot dimensions --------------------------------------------------------
ALTER TABLE "Plot" ADD COLUMN IF NOT EXISTS "dimensions" TEXT;

-- 3. Shape kinds ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LayoutShapeKind') THEN
    CREATE TYPE "LayoutShapeKind" AS ENUM (
      'PLOT', 'AMENITY', 'ROAD', 'PARK', 'ENTRANCE', 'OTHER'
    );
  END IF;
END
$$;

-- 4. Layout -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Layout" (
  "id"          TEXT NOT NULL,
  "projectId"   TEXT NOT NULL,
  "name"        TEXT NOT NULL DEFAULT 'Master Layout',
  "description" TEXT,
  "imageUrl"    TEXT NOT NULL,
  "imageWidth"  INTEGER NOT NULL,
  "imageHeight" INTEGER NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Layout_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Layout_projectId_fkey'
  ) THEN
    ALTER TABLE "Layout"
      ADD CONSTRAINT "Layout_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "Layout_projectId_sortOrder_idx"
  ON "Layout" ("projectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "Layout_projectId_isPublished_idx"
  ON "Layout" ("projectId", "isPublished");

-- 5. LayoutShape ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "LayoutShape" (
  "id"        TEXT NOT NULL,
  "layoutId"  TEXT NOT NULL,
  "plotId"    TEXT,
  "kind"      "LayoutShapeKind" NOT NULL DEFAULT 'PLOT',
  "label"     TEXT,
  "points"    JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LayoutShape_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LayoutShape_layoutId_fkey'
  ) THEN
    ALTER TABLE "LayoutShape"
      ADD CONSTRAINT "LayoutShape_layoutId_fkey"
      FOREIGN KEY ("layoutId") REFERENCES "Layout"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LayoutShape_plotId_fkey'
  ) THEN
    -- SET NULL, not CASCADE: deleting a plot record must not silently erase
    -- the boundary drawn on the plan.
    ALTER TABLE "LayoutShape"
      ADD CONSTRAINT "LayoutShape_plotId_fkey"
      FOREIGN KEY ("plotId") REFERENCES "Plot"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "LayoutShape_layoutId_plotId_key"
  ON "LayoutShape" ("layoutId", "plotId");
CREATE INDEX IF NOT EXISTS "LayoutShape_layoutId_idx" ON "LayoutShape" ("layoutId");
CREATE INDEX IF NOT EXISTS "LayoutShape_plotId_idx" ON "LayoutShape" ("plotId");
