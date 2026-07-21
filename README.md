# Own A Plot

Next.js 15 (App Router) + React 19 + TypeScript + Prisma + PostgreSQL, with a
public marketing site and a role-based admin.

```bash
npm install
cp .env.example .env          # fill it in
npx prisma generate
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
npm run seed
npm run dev
```

Public site at `http://localhost:3000`, admin at `/admin/login`.

Full guides: [Deployment](docs/DEPLOYMENT.md) · [Migrations](docs/MIGRATIONS.md)
· [Seeding](docs/SEEDING.md) · [Architecture](docs/ARCHITECTURE.md)

---

## What is here

**Public site.** Home, ventures index and detail, plots index and detail, about,
contact. Every word is database-driven and editable from the admin; an empty
database still renders the approved design, because the CMS layer merges stored
content over built-in defaults rather than replacing it.

**Admin.** Ventures, plots, interactive master layouts, enquiries, CMS, media
library, employees, activity log, settings.

**RBAC.** Seven roles over a 13-resource × 6-action permission matrix, with
per-employee grant and revoke overrides.

**Interactive master layout.** An uploaded plan with clickable plot boundaries
drawn over it, zoom/pan/pinch, and a popup carrying extent, dimensions, facing,
price and status.

---

## Roles

| Role | Reach |
|---|---|
| **Super Admin** | Everything. The only role that can delete employees or create another Super Admin. |
| **Admin** | Everything except deleting employees. |
| **Sales Executive** | Enquiries, CRM, plot availability. Read-only on ventures. |
| **Layout Designer** | Dashboard, Ventures (read), Layout Management. Nothing else. |
| **Marketing** | Content, media, publishing ventures, analytics. |
| **Finance** | Pricing, booked value, financial reporting and exports. |
| **Customer Support** | Answers and updates enquiries. Cannot publish or reprice. |

Permissions are `resource:action` strings resolved from the role, then adjusted
by explicit grants and revocations on the employee record. **Revoke beats
grant.** Super Admin is a wildcard rather than an enumerated list, so a resource
added later is automatically visible to the owner instead of silently locking
them out.

`publish` is deliberately separate from `edit` for both ventures and layouts:
Marketing can push a venture live, Sales can fix a typo in it and cannot.

---

## Three layers of enforcement

1. **Edge middleware** — verifies the JWT and checks the route against the
   permission table. Fast, no database.
2. **Server components** — `requirePageAccess()` on every admin page.
3. **API routes** — `requirePermission()` on every handler.

The role in the token is a **cache, not the source of truth**. `getCurrentUser()`
re-reads the employee row from Postgres on every request, so a deactivation or a
demotion takes effect on the next navigation rather than whenever the seven-day
cookie expires. Middleware is the fast fence; the database is the real one.

---

## Admin address

One environment variable switches between two deployment shapes, with no code
change and no second build:

```bash
NEXT_PUBLIC_ADMIN_URL=""                            # ownaplot.com/admin/login
NEXT_PUBLIC_ADMIN_URL="https://admin.ownaplot.com"  # admin.ownaplot.com/login
```

In subdomain mode middleware rewrites that host's root onto `/admin/*` and the
session cookie widens to the registrable parent so it is valid on both hosts.
Nothing in the codebase builds an admin URL by hand — every link goes through
`src/lib/admin-url.ts`.

---

## Master layout coordinates

Polygon points are stored **normalised to 0..1** of the plan image's width and
height, never as pixels. Pixels tie every boundary to one export of one image:
the architect re-renders the plan at higher resolution and every polygon
silently drifts. Normalised points are resolution-independent and the render is
a single multiply.

The uploaded artwork is never modified. Boundaries are an SVG overlay sharing
the image's coordinate space through a `viewBox` set to its intrinsic pixel
size.

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` then a production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Bootstrap admin, settings, demo ventures |
| `npm run prisma:migrate` | Create a migration (development) |
| `npm run prisma:deploy` | Apply migrations (production) |
| `npm run prisma:studio` | Prisma Studio |

The build fails on any TypeScript or ESLint error. `next.config.ts` sets
`ignoreBuildErrors: false` and `ignoreDuringBuilds: false` explicitly, because
both default to permissive in Next's template.

---

## Layout of the source

```
prisma/
  schema.prisma            Single schema. Extended, never rewritten.
  migrations/              Four additive migrations.
  seed.ts                  Idempotent.
src/
  app/
    (public)/              Marketing site
    admin/(dashboard)/     Admin, permission-guarded
    api/                   Route handlers
    middleware.ts          Edge auth + RBAC + admin-host rewrite
  components/
    admin/                 Admin UI
    public/                Marketing UI
  lib/
    permissions.ts         The RBAC matrix. Edge-safe.
    auth.ts                Node-only guards, DB-backed current user.
    session.ts             JWT. Edge-safe.
    guard.ts               Server-component page guards.
    activity.ts            Audit trail.
    layout.ts              Master-layout geometry and palette.
    admin-url.ts           Admin address resolution. Edge-safe.
    cache.ts               Tagged caches and their invalidation.
    db.ts                  Prisma singleton.
```

**Edge-safe matters.** `middleware.ts` runs on the Edge runtime and cannot
import Prisma, bcrypt or `next/headers`. `permissions.ts`, `session.ts` and
`admin-url.ts` are kept free of those on purpose; `auth.ts` is not and must
never be imported from middleware.

---

## Security notes

- `AUTH_SECRET` has a development fallback. Unset in production means **anyone
  can forge an admin session**. Set it.
- Login is rate-limited per IP and equalises response timing between "no such
  account" and "wrong password", so admin emails cannot be enumerated.
- Deactivation is checked *after* the password, so an attacker cannot confirm
  that an address is a real employee.
- Nobody can change their own role, deactivate themselves, or remove the last
  active Super Admin.
- An Admin cannot create a Super Admin, and nobody can grant a permission they
  do not themselves hold.
- The activity log is append-only. There is no delete endpoint and there should
  never be one.
- `.env.example` contains placeholders only. If you inherited a version of this
  repository with a real credential in it, **rotate that credential**.
