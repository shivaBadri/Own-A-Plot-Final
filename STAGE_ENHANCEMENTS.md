# Own A Plot — Enhancement Pass

This pass extended the existing `updated_final` project. Prior stages were
already applied (see `prisma/migrations/*stage1/2/3*`), so this work targeted the
**gaps** rather than rebuilding what existed. All existing functionality,
components, APIs, Prisma models, auth and layouts were preserved.

## Verification

- `tsc --noEmit` — **0 errors**
- `eslint src/**/*` — **0 errors, 0 warnings**
- `next build` — **succeeds** (full route table compiled). The only step that
  fails in a network-restricted environment is `next/font/google` fetching
  Playfair Display + Inter from Google Fonts; that resolves on any machine with
  network and is unrelated to these changes.

## What was implemented

### Stage 2 — Admin
- **Portal Login in Settings** — new configurable customer/partner portal
  (enable toggle, label, URL).
- **Bulk Plot Update** — multi-select on the plots table with a bulk status bar,
  backed by a new `PATCH /api/plots/bulk` endpoint (permission-gated, audit-logged).
- **Layer Manager** — in the layout editor: show/hide, lock/unlock, and reorder
  (paint-stack) per boundary.
- **Drawing tools** — rectangle and circle drag-drawing added alongside the
  existing freehand polygon tool. Both generate standard normalised-polygon
  point sets, so nothing about storage or public rendering changed.

### Stage 3 — Website & Customer Experience
- **Auto-zoom to selected plot** — selecting a plot (by tap or from search)
  smoothly frames it, accounting for the object-contain letterbox.
- **Plot search** — an in-viewer search across plot number, area, facing, price
  and status; results select and frame the plot.
- **Brochure card layout preview** — a master-layout preview sits inside the
  brochure card, above the download, linking to the full interactive plan.
- **Navigation Login button** — the navbar shows a portal login button driven by
  Settings (top bar + mobile menu).

### Stage 4 — Premium UI & Website Management
- **Premium theme layer** — a `gold` accent, soft/float shadow tokens, and
  opt-in `surface-warm` / `card-float` / `glass-panel` / `accent-gold`
  utilities. Applied to the viewer's floating overlays. This is deliberately
  additive: the existing flat editorial system is preserved, not overwritten.
- **Feature Manager** — a typed feature-flag registry (`src/lib/features.ts`)
  editable from Settings, gating: interactive layout, plot search, auto-zoom,
  brochure preview, and the portal button. Consumed by the public site.

## Database changes

One new **non-destructive** migration:
`prisma/migrations/20260721100000_stage4_portal_features/migration.sql`
adds to `SiteSettings`: `portalEnabled`, `portalLabel`, `portalUrl`, `features`
(all nullable / defaulted — no backfill, no downtime).

## New files
- `src/lib/features.ts` — feature-flag registry + resolver
- `src/app/api/plots/bulk/route.ts` — bulk plot update API
- `src/components/admin/PlotsBulkTable.tsx` — plots table with selection + bulk bar
- `prisma/migrations/20260721100000_stage4_portal_features/migration.sql`

## Modified files
- `prisma/schema.prisma` — portal + features on `SiteSettings`
- `src/lib/settings.ts` — resolve portal + features
- `src/lib/validations/index.ts` — settings portal/features + `plotBulkUpdateSchema`
- `src/lib/layout.ts` — `rectanglePoints`, `circlePoints` helpers
- `src/app/api/settings/route.ts` — persist features (sanitised) + portal
- `src/components/admin/SettingsForm.tsx` — Portal + Feature Manager sections
- `src/app/admin/(dashboard)/settings/page.tsx` — description
- `src/app/admin/(dashboard)/plots/page.tsx` — uses `PlotsBulkTable`
- `src/components/public/Navbar.tsx` — portal login button
- `src/app/(public)/layout.tsx` — passes portal prop (gated)
- `src/components/public/MasterLayout.tsx` — auto-zoom + plot search + glass
- `src/app/(public)/ventures/[slug]/page.tsx` — brochure preview + feature gates
- `src/components/admin/LayoutEditor.tsx` — drawing tools + Layer Manager
- `tailwind.config.ts` — gold + shadow tokens
- `src/app/globals.css` — gold token + premium utilities

## Not included (deliberately scoped out)
- **Full Website Manager** (multi-entity draft/preview/publish/version-history/
  change-log/7-day rollback). This is a large net-new subsystem; the
  **Feature Manager** portion of the Stage-4 brief is delivered, but the
  versioned-content platform was left for a dedicated pass with a live database.
- **Line / Text / Marker** drawing tools — these need non-polygon geometry
  (new schema + renderer changes on both editor and public sides). Rectangle and
  circle fit the existing polygon model with zero storage/render risk, so they
  were included; the annotation primitives were not.

## Deployment notes
```bash
npm install
npx prisma migrate deploy   # applies the new non-destructive migration
npx prisma generate
npm run build
npm start
```
Environment variables are unchanged from the existing `.env.example`.
