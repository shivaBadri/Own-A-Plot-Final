# Deployment Guide

Target: Vercel + Neon PostgreSQL + Cloudinary. Nothing here is Vercel-specific
except where marked; the app is a standard Next.js 15 standalone build.

---

## 1. Provision

**Neon.** Create a project. Copy two connection strings from the dashboard:

- the **pooled** one (host contains `-pooler`) → `DATABASE_URL`
- the **direct** one (no `-pooler`) → `DIRECT_URL`

They are not interchangeable. The pooled endpoint runs through PgBouncer in
transaction mode and **cannot execute DDL**, so `prisma migrate deploy` against
it fails partway through and leaves the schema half-applied. The app uses the
pooled string; migrations use the direct one.

**Cloudinary.** Create an account, copy the cloud name, API key and API secret.
Uploads land in `own-a-plot/images` and `own-a-plot/brochures`.

---

## 2. Environment

Copy `.env.example` to `.env` and fill it in. The variables that will actually
stop a deploy if you get them wrong:

| Variable | Consequence if wrong |
|---|---|
| `AUTH_SECRET` | Unset falls back to a hardcoded dev value. **Anyone can forge an admin session.** Generate with `openssl rand -base64 32`. |
| `DATABASE_URL` | Pooled string, or every page 503s. |
| `DIRECT_URL` | Direct string, or migrations fail mid-run. |
| `NEXT_PUBLIC_SITE_URL` | Wrong value produces wrong canonical URLs and a sitemap pointing at localhost. No trailing slash. |
| `NEXT_PUBLIC_ADMIN_URL` | Chooses the admin deployment mode. See below. |

`NEXT_PUBLIC_*` variables are **inlined at build time**. Changing one requires a
redeploy, not just an environment update.

---

## 3. Choose the admin deployment mode

One variable. No code change, no second build.

### Path mode (default)

```
NEXT_PUBLIC_ADMIN_URL=""
```

Admin at `https://ownaplot.com/admin/login`. Nothing else to configure.

### Subdomain mode

```
NEXT_PUBLIC_SITE_URL="https://ownaplot.com"
NEXT_PUBLIC_ADMIN_URL="https://admin.ownaplot.com"
```

Admin at `https://admin.ownaplot.com/login`.

1. Add `admin.ownaplot.com` as a domain on the **same** Vercel project.
2. Point the DNS `CNAME` at Vercel as usual.
3. Redeploy so the new `NEXT_PUBLIC_ADMIN_URL` is inlined.

Middleware rewrites that hostname's root onto `/admin/*` internally. The routes,
the permission guards and the session cookie are identical in both modes — only
the address changes.

The session cookie widens to `.ownaplot.com` automatically in subdomain mode so
it is valid on both hosts. Override with `SESSION_COOKIE_DOMAIN` only if your
DNS makes that inference wrong.

**Preview deployments.** Vercel preview URLs are random hostnames that match
neither variable, so they fall back to path mode and the admin stays reachable
at `/admin/login`. That is deliberate. Add specific preview hostnames to
`ADMIN_HOSTNAMES` (comma separated) if you want subdomain behaviour there too.

---

## 4. First deploy

```bash
npm install
npx prisma generate

# Migrations run against the DIRECT url, once, from your machine or CI.
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy

# Creates the first SUPER_ADMIN and the demo ventures.
npm run seed

npm run build
```

On Vercel, `postinstall` already runs `prisma generate` and the build script runs
it again — you do not need a custom build command. **Do not** put
`migrate deploy` in the build command: builds run concurrently across preview
deployments and two migrations racing on one database is how you get a lock
timeout mid-DDL.

---

## 5. Immediately after the first deploy

1. Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
2. Change that password at `/admin/profile`.
3. Remove `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from the environment.
4. Create real employees under **Employees** and give people the narrowest role
   that lets them do their job. Do not hand out Super Admin.

---

## 6. What is cached, and how to reason about it

| Layer | Lifetime | Invalidated by |
|---|---|---|
| Client router cache | 30s dynamic / 180s static | `router.refresh()` after every mutation |
| Sidebar enquiry badge | 60s, tagged | any enquiry write |
| Venture `<select>` options | 300s, tagged | any venture write |
| Layout data | tagged | any layout or shape write |

Every admin page is `force-dynamic`, so nothing user-specific is ever served
from a shared cache. `/admin/*` also sends `Cache-Control: private, no-store`
and `X-Robots-Tag: noindex`.

If a colleague's edit takes up to 30 seconds to appear in your tab, that is the
router cache and it is intentional. Your **own** edits appear immediately.

---

## 7. Health checks after deploying

- `GET /` renders and the footer shows real settings, not defaults → database
  reachable.
- `GET /sitemap.xml` lists published ventures → Prisma reads working.
- Sign in, then deactivate a test employee and try their session → they should
  be bounced on the next navigation, not in seven days.
- Upload an image in Media → Cloudinary credentials correct.
- Open a published venture with a layout → the master layout renders and a plot
  popup opens.

---

## 8. Rolling back

Application code: redeploy the previous Vercel build. Safe — nothing in stages
1–4 removed a column or changed a type, so old code runs against the new schema.

Database: the migrations are additive. There is no down-migration, and writing
one for `ALTER TYPE ... ADD VALUE` is not possible without recreating the enum.
If you must revert the schema, restore a Neon branch from before the migration
rather than trying to undo it in place.
