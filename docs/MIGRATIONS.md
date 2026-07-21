# Migration Guide

Four migrations ship with this project. All are **additive**: no column is
dropped, renamed or retyped, and no existing row changes meaning. An existing
production database can take all four without downtime.

| Migration | Adds |
|---|---|
| `20260713000000_init` | Original schema |
| `20260719100000_stage1_performance_indexes` | 13 indexes |
| `20260719110000_stage2_rbac_employees` | `Role` enum, employee columns, `ActivityLog` |
| `20260719120000_stage3_master_layout` | `BOOKED`/`BLOCKED` statuses, `Plot.dimensions`, `Layout`, `LayoutShape` |

---

## Running them

```bash
# ALWAYS against the DIRECT (non-pooled) connection string.
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
```

Neon's pooled endpoint runs PgBouncer in transaction mode and cannot execute
DDL. Pointing `migrate deploy` at it fails partway and leaves the schema
half-applied, which is worse than not running it at all.

Then regenerate the client:

```bash
npx prisma generate
```

---

## Things in these migrations that are worth knowing about

### Existing admins are promoted, not demoted

`Admin.role` defaults to `ADMIN`, but stage 2 contains:

```sql
UPDATE "Admin" SET "role" = 'SUPER_ADMIN' WHERE "createdById" IS NULL;
```

Anyone who had an account before roles existed was an unrestricted
administrator. Letting them fall to the column default would lock the owner out
of the employee module on the very deploy that introduced it. `createdById IS
NULL` identifies pre-existing accounts, because every employee created through
the new UI carries the id of whoever created them.

**Check this landed.** If you have more than one pre-existing admin, they all
become Super Admin. Demote the ones who should not be, from
`/admin/employees`, immediately after deploying.

### `ALTER TYPE ... ADD VALUE` inside a transaction

Stage 3 adds two values to the `PlotStatus` enum. PostgreSQL 12+ permits this
inside a transaction block **provided the new label is not used in the same
transaction**. Nothing in the migration writes a `BOOKED` or `BLOCKED` row, so
it is safe under Prisma's transactional runner.

On PostgreSQL 11 or earlier this fails. Neon runs 15+, so this is only a concern
if you are migrating to a different host.

### Everything is idempotent

Every statement is `IF NOT EXISTS`, or wrapped in a `DO $$ ... $$` block that
checks `pg_constraint` / `pg_type` first. Re-running a migration is a no-op
rather than an error. This exists because partially-applied migrations are the
normal failure mode with a pooled connection, and recovery should not require
hand-editing `_prisma_migrations`.

### `LayoutShape.plotId` is `ON DELETE SET NULL`, not `CASCADE`

Deleting a plot record nulls the link but leaves the polygon on the plan. That
is intentional — cascading would silently punch a hole in a drawing that
somebody spent an afternoon tracing. The orphaned boundary shows up dashed and
in the warning colour in the layout editor, with a count, so it gets noticed.

### Deleting a `Layout` does not delete its image

The plan artwork stays in Cloudinary and in the media library. It is usually the
architect's master file, reused across phases, and destroying it because one
layout record was removed is not recoverable.

---

## Creating a new migration

```bash
# Edit prisma/schema.prisma, then:
DATABASE_URL="$DIRECT_URL" npx prisma migrate dev --name what_it_does
```

Review the generated SQL before committing. Prisma will happily emit a
destructive `DROP COLUMN` for a rename; if that is not what you meant, write the
migration by hand.

For anything touching an enum or a column that production data depends on,
prefer the pattern used here: additive change, backfill, and only then a
separate later migration that removes the old thing — if it ever needs removing
at all.

---

## Verifying a migration landed

```sql
-- Roles present, and somebody holds SUPER_ADMIN
SELECT role, count(*) FROM "Admin" GROUP BY role;

-- New plot statuses available
SELECT unnest(enum_range(NULL::"PlotStatus"));

-- Layout tables exist
SELECT count(*) FROM "Layout";
SELECT count(*) FROM "LayoutShape";

-- Indexes from stage 1
SELECT indexname FROM pg_indexes
WHERE tablename IN ('Plot','Project','Enquiry','Media')
ORDER BY indexname;
```

---

## Rollback

There are no down-migrations, and one cannot meaningfully be written for
`ALTER TYPE ... ADD VALUE` without recreating the enum and every column that
references it.

Because every change is additive, **the previous application build runs
correctly against the new schema**. So the rollback procedure is: redeploy the
old code and leave the database alone.

If the schema itself must be reverted, restore a Neon branch taken before the
migration. Do not attempt to undo it in place.
