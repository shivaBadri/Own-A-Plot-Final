# Architecture Notes

Decisions that are not obvious from reading the code, and the reasoning behind
them. Written so that whoever changes this next knows which choices were
deliberate and which were incidental.

---

## Why the admin felt slow, and what actually fixed it

The reported symptom was 2–3 seconds of dead time when navigating between admin
pages. The instinct is to blame queries. It was not queries.

**Cause 1 — no `loading.tsx` anywhere.** Every admin route is `force-dynamic`,
so a navigation cannot be served from a prerender and must wait for a server
round trip. Without a Suspense boundary for that segment, Next has nothing to
swap in: the *old page stays frozen on screen* for the entire request. To the
person clicking, the app looks broken rather than busy. Adding a group-level
skeleton took perceived latency to roughly zero without making the server one
millisecond faster.

**Cause 2 — `staleTimes.dynamic` defaults to 0 in Next 15.** Every
back-navigation refetched the full RSC payload. Setting it to 30 seconds makes
returning to a page you were just on instant. Mutations call `router.refresh()`,
which busts the entry, so your own edits are never stale.

Index tuning and the Prisma singleton fix were both worth doing, and neither
would have moved the number the client was complaining about. Recording this
because the next person to hear "the admin is slow" will also reach for the
database first.

## The Prisma singleton was not a singleton

The original assigned `globalThis.prisma` only outside production. On Vercel
each route handler is its own module graph entry, so a warm lambda
re-evaluating the module constructed a *second* `PrismaClient` and opened a
second pool against Neon. The global is now assigned unconditionally.

---

## RBAC

### The token is a cache; the database is the truth

Session claims carry `role`, `grants` and `revokes` so middleware can decide
route access on the Edge without a database round trip — the difference between
a 5ms redirect and a 300ms one on every navigation.

But those claims are a snapshot up to seven days old. So `getCurrentUser()`
re-reads the employee row from Postgres on every request, and the admin layout
plus every API guard use *that*. A demotion or a deactivation therefore takes
effect on the next navigation.

Middleware is the fast fence. It is allowed to be briefly wrong in the
permissive direction because two more fences sit behind it.

### Super Admin is a wildcard, not a list

`permissionsForRole("SUPER_ADMIN")` returns everything computed from the
resource table rather than a hand-maintained array. When stage 3 added the
`layouts` resource, the owner could reach it immediately. The alternative
fails silently and in the worst direction: a new module invisible to the one
person who needs to configure it.

### Publish is separate from edit

`ventures:edit` does not imply `ventures:publish`, and the same for layouts.
Marketing pushes live; Sales corrects a typo and cannot. Without this the
`publish` action in the matrix would have been decorative — every role that
could edit could also publish, and the distinction the client asked for would
exist only in the UI.

### Escalation fences

Enforced server-side, not just hidden in the UI:

- An Admin cannot create or modify a Super Admin.
- Nobody can grant a permission they do not hold.
- Nobody can change their own role or deactivate themselves.
- The last active Super Admin cannot be demoted, deactivated or deleted.

The last one is the important one. Without it, one person with good intentions
locks the company out of its own admin panel in two clicks with no way back.

### Layout Designer

The brief specified exactly five things: Dashboard, Ventures, Layout
Management, Preview, Logout — and explicitly no Media and no Users.

But drawing a plan requires uploading an image, and binding a boundary requires
reading plot numbers. Rather than quietly granting `media:create` and
`plots:view` (which would have added nav items the client did not ask for), both
capabilities are served *through* the layouts resource:

- `/api/upload` accepts `media:create` **or** `layouts:edit`
- the layout editor reads its own plot list, scoped to one venture, under
  `layouts:view`

The navigation matches the spec exactly and the feature works.

---

## Master layout

### Coordinates are normalised, not pixels

Points are stored as `{ x, y }` in 0..1 of the plan image's width and height.

Pixels would tie every boundary to one export of one image. The architect
re-renders the plan at 4000px six months later, somebody swaps the file, and
every polygon silently drifts — with no error, no failed build, and nobody
noticing until a buyer clicks the wrong plot. Normalised points survive any
re-export, and the render is a single multiply.

### The plan image is never modified

Boundaries are an SVG overlay whose `viewBox` is the image's intrinsic pixel
size. Nothing is burned into the artwork.

Intrinsic dimensions are captured at upload — from Cloudinary's response where
available, otherwise by loading the image once in the browser — and stored on
the `Layout` row. Measuring on every public page load would mean a layout shift
on every visit; measuring server-side would mean adding `sharp`.

### One CSS transform, not two

Zoom and pan apply to a wrapper containing *both* the `<img>` and the `<svg>`.
Transforming them separately means two sets of floating-point maths that agree
at 1× and visibly disagree at 8×.

### Pointer handling is one code path

A `Map` keyed by `pointerId` serves mouse drag, one-finger pan and two-finger
pinch. The common alternative — separate mouse and touch listener sets — is
three implementations that disagree at the boundaries, most visibly when a
pinch ends with one finger still down.

### Small things that matter

- **Wheel zoom is registered manually with `{ passive: false }`.** React's
  `onWheel` is passive, so `preventDefault()` is ignored and the page scrolls
  away underneath you.
- **A 4px movement threshold separates a tap from a drag.** Without it every
  click on a plot is swallowed as a pan.
- **Labels are hidden below 1.4× zoom.** A 200-plot venture renders 200
  overlapping numbers at fit-to-frame, which defeats the purpose of the plan.
- **Centroids are area-weighted, not vertex means.** On an L-shaped corner plot
  the mean lands outside the polygon and the label floats over the road.
- **The editor converts screen→image coordinates through the SVG's own CTM**,
  not `getBoundingClientRect` arithmetic. Rect maths drifts under the zoom
  transform and under `preserveAspectRatio` letterboxing — precisely at the zoom
  level people actually trace at.

### Shapes save as one atomic replace

`PUT /api/layouts/[id]/shapes` replaces the whole set in a transaction. The
editor's unit of work is the whole drawing: trace six plots, delete two, re-bind
a third, hit Save. Eleven separate REST calls means eleven chances to
half-apply and leave a plan nobody drew.

The endpoint verifies every bound plot belongs to *this* venture. Without that,
a crafted request could surface a neighbouring project's inventory on a public
plan.

### `BOOKED` and `BLOCKED` are not colour variants

`BOOKED` is money received with registration pending — commercially different
from `RESERVED`, which is a soft hold. `BLOCKED` is land not for sale at all:
easements, substations, temple plots, internal roads. Adding them to the enum
rather than faking them with a flag means the status *is* the colour and the two
cannot drift.

Related: the dashboard's booked-value figure now counts `SOLD + BOOKED`. It
previously counted only `SOLD`, understating the position by an entire pipeline
stage.

---

## Dual-domain admin

One variable, `NEXT_PUBLIC_ADMIN_URL`, with three behaviours:

- unset → path mode
- set to the same hostname as `NEXT_PUBLIC_SITE_URL` → also path mode, because
  that is somebody writing `https://ownaplot.com/admin` the long way round
- set to a different hostname → subdomain mode

In subdomain mode middleware rewrites that host's root onto `/admin/*`, so a
single set of routes, guards and cookies serves both shapes. Preview
deployments have random hostnames matching neither variable and therefore fall
back to path mode, which keeps the admin reachable — deliberate, not an
accident.

**The cookie-clearing detail.** `clearSessionCookie()` must set the same
`domain` used when the cookie was created. Deleting a cookie with a different
domain deletes a *different cookie*, and the session survives the sign-out.
This is the kind of bug that only appears in subdomain mode, in production,
after the client has already been handed the build.

---

## Caching

| What | Mechanism | Invalidated by |
|---|---|---|
| Venture `<select>` options | `unstable_cache`, 300s, tagged | any venture write |
| Sidebar enquiry badge | `unstable_cache`, 60s, tagged | any enquiry write |
| Venture-by-slug | React `cache()` | request scope |
| Client router | `staleTimes` 30s | `router.refresh()` |

The venture-by-slug case is worth naming: `generateMetadata` and the page
component both need the venture, and the include pulls every plot and every
layout shape. Without `cache()` that expensive query ran **twice per page
view**.

---

## The audit log

Append-only. There is no `POST`, `PATCH` or `DELETE` on `/api/activity` and
there should never be one — a log an administrator can quietly edit answers no
question worth asking.

`actorName`, `actorEmail` and `actorRole` are denormalised onto every row so the
entry stays readable after the employee is deleted. `actorId` is
`ON DELETE SET NULL` for the same reason.

`logActivity()` swallows its own failures and logs to stderr. A failed audit
write must never fail the action it was recording: the employee's venture did
save, and they should see that it saved.
