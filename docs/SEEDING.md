# Seed Guide

```bash
npm run seed
```

Idempotent. Safe to re-run — it upserts on `Project.slug`, `Admin.email` and the
settings singleton, so nothing is duplicated and nobody's password is reset.

---

## What it creates

**One `SUPER_ADMIN`**, from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

Re-running the seed applies `{ role: "SUPER_ADMIN", isActive: true }` to that
account but **does not touch its password**. That is a repair path: if somebody
demotes or deactivates the owner account by mistake and there is no other Super
Admin left to fix it, re-running the seed restores access without a password
reset.

**Site settings**, the singleton row behind the footer, contact page and default
SEO.

**Three ventures** — Hemadri Groves, Hills and Shores — with their full
editorial content: hero, story, gallery, amenities, landscape rows, location
advantages, nearby distances, brochure.

**Plots** on the first venture, across several statuses.

The seed does **not** create a master layout. That needs a real plan image and
hand-traced boundaries, and a fabricated one would look like a bug. Create the
first layout through the admin: **Layouts → New layout**.

---

## Configuring it

```bash
SEED_ADMIN_EMAIL="you@company.com"
SEED_ADMIN_PASSWORD="a-long-password-you-will-change-immediately"
```

Both have defaults (`admin@ownaplot.com` / `changeme123`). The defaults are fine
for local work and are **not** fine anywhere reachable from the internet.

After the first production seed:

1. Sign in.
2. Change the password at `/admin/profile`.
3. Delete `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from the environment.

---

## Seeding an existing database

The seed only ever upserts, so running it against a populated database will:

- leave your ventures alone unless a slug collides with `hemadri-groves`,
  `hemadri-hills` or `hemadri-shores`
- leave your admin passwords alone
- leave site settings alone if the singleton already exists

If you want the demo ventures gone in production, delete them from
**Admin → Ventures** after seeding. Deleting a venture cascades to its plots and
layouts and nulls the link on its enquiries and media.

---

## Building your own seed data

`prisma/seed.ts` is plain TypeScript against the Prisma client. The venture
objects are typed as `Prisma.ProjectCreateInput`, so a field you spell wrong is
a compile error rather than a silently missing hero image.

To add a venture, append to the `ventures` array. To add a master layout in a
seed rather than through the UI you need:

```ts
const layout = await prisma.layout.create({
  data: {
    projectId: project.id,
    name: "Master Layout",
    imageUrl: "https://res.cloudinary.com/…/plan.jpg",
    // Intrinsic pixel size of that image. The SVG overlay's viewBox depends
    // on it; get it wrong and every boundary is offset.
    imageWidth: 2400,
    imageHeight: 1600,
    isPublished: true,
  },
});

await prisma.layoutShape.create({
  data: {
    layoutId: layout.id,
    plotId: plot.id,
    kind: "PLOT",
    // NORMALISED 0..1 of image width and height — never pixels.
    points: [
      { x: 0.21, y: 0.34 },
      { x: 0.29, y: 0.34 },
      { x: 0.29, y: 0.46 },
      { x: 0.21, y: 0.46 },
    ],
  },
});
```

Coordinates are normalised so the drawing survives a re-export of the plan at a
different resolution. Storing pixels ties every boundary to one export of one
image.

---

## Resetting local data

```bash
# Destroys everything and replays every migration, then seeds.
DATABASE_URL="$DIRECT_URL" npx prisma migrate reset
```

Never run this against production. It drops the database.
