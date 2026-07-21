import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seeds the database with the admin account, site settings, and the three
 * ventures from the approved design — Hemadri Groves, Hills, and Shores —
 * with their full editorial content.
 *
 * This is what makes the migration real: run the seed and the public site
 * renders exactly the approved design, but every word of it now comes out of
 * Postgres and is editable in the admin.
 *
 * Idempotent. Safe to re-run; it upserts on slug and email.
 */

const prisma = new PrismaClient();

const IMG = {
  field:
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2400&auto=format&fit=crop",
  road: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2000&auto=format&fit=crop",
  trees:
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop",
  hills:
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2000&auto=format&fit=crop",
  valley:
    "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=2000&auto=format&fit=crop",
  boundary:
    "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?q=80&w=2000&auto=format&fit=crop",
  curve:
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2000&auto=format&fit=crop",
};

const ventures: Prisma.ProjectCreateInput[] = [
  {
    slug: "hemadri-groves",
    name: "Hemadri Groves",
    tagline: "A quiet grove between two hills, held for the long view.",
    description:
      "Forty-two acres of gentle slope in the Kadthal corridor, chosen for its light and its silence. Single-owner title, DTCP approved, and drawn along the contour of the land rather than across it.",
    location: "Kadthal, Hyderabad",
    region: "South of the city, 45 minutes from the airport",
    totalAcres: 42,
    status: "ONGOING",
    accent: "OLIVE",
    isPublished: true,
    featured: true,
    sortOrder: 1,
    heroImage: IMG.field,
    coverImage: IMG.field,
    gallery: [
      IMG.road,
      IMG.trees,
      IMG.hills,
      IMG.valley,
      IMG.boundary,
      IMG.curve,
    ],
    storyEyebrow: "The Ground Beneath",
    storyTitle:
      "Forty-two acres of gentle slope, chosen for its light and its silence.",
    storyBody: [
      "Hemadri Groves rests between two low ranges, in a valley that catches the morning sun and holds the evening cool. The land carries an old rhythm — mango trees at the boundary, tamarind at the centre, a small seasonal stream running east.",
      "We spent a year walking this land before we drew a single line. Every road follows the contour. Every plot faces its sky. Nothing was flattened that did not need to be flattened.",
    ],
    amenities: [
      "Compound wall, all around",
      "Metalled internal roads, 30 ft & 40 ft",
      "Rainwater harvesting network",
      "Avenue trees along every road",
      "Underground electric",
      "Sewage & waste water plan",
      "Common gazebo & sit-out grove",
      "Overhead water storage",
      "Solar street lighting",
      "Managed entrance & security cabin",
    ],
    details: [
      { label: "Total Extent", value: "42 acres" },
      { label: "Plot Sizes", value: "200 – 500 sq. yd" },
      { label: "Road Widths", value: "30 ft & 40 ft" },
      { label: "Open Space", value: "12% of total extent" },
      { label: "DTCP Status", value: "Approved" },
    ],
    advantages: [
      {
        title: "Held Elevation",
        body: "Naturally raised ground, well above the flood line and well below the noise line of the state highway.",
        image: IMG.road,
      },
      {
        title: "Water Table at 40 ft",
        body: "A shallow, dependable aquifer verified across three seasons — rare for the region and a quiet form of long-term wealth.",
        image: IMG.hills,
      },
      {
        title: "Growing Corridor",
        body: "The Kadthal-Shadnagar belt has seen steady infrastructure investment since 2019 without the speculative churn of hotter markets.",
        image: IMG.boundary,
      },
      {
        title: "Verified Title",
        body: "Single-owner title, cleared through independent legal review. Layout regularization complete with the local municipality.",
        image: IMG.curve,
      },
    ],
    landscape: [
      {
        title: "The Grove at the Centre",
        body: "A three-quarter-acre grove of tamarind and neem, kept exactly as we found it. A slow, shaded place — for reading, for children, for evenings.",
        image: IMG.trees,
      },
      {
        title: "The East Ridge",
        body: "A long ridge line that catches the first light. Every plot along its edge looks out over an unbroken horizon.",
        image: IMG.road,
      },
      {
        title: "The Seasonal Stream",
        body: "A small stream that runs the length of the property in the monsoon. Its bed is left untouched and forms the natural park edge.",
        image: IMG.hills,
      },
    ],
    address:
      "Survey No. 214/A & 215, Hemadri Village, Kadthal Mandal, Rangareddy District",
    latitude: 17.048,
    longitude: 78.401,
    mapEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d60870.9!2d78.35!3d17.05!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcbb9b7!2sKadthal!5e0!3m2!1sen!2sin!4v1710000000000",
    nearby: [
      { name: "Rajiv Gandhi Intl. Airport", distance: "45 min" },
      { name: "ORR Junction (Exit 14)", distance: "22 min" },
      { name: "Amazon Fulfilment Centre", distance: "18 min" },
      { name: "Symbiosis University", distance: "26 min" },
      { name: "Kadthal Town Centre", distance: "6 min" },
      { name: "Srisailam Highway", distance: "4 min" },
    ],
    seoTitle: "Hemadri Groves — 42 acres in Kadthal, Hyderabad",
    seoDescription:
      "A DTCP-approved managed land venture of 42 acres between two low hills in the Kadthal corridor. Verified title, 30–40 ft roads, water table at 40 ft.",
  },
  {
    slug: "hemadri-hills",
    name: "Hemadri Hills",
    tagline: "A hillside chapter, opening for private preview.",
    description:
      "Twenty-eight acres on a west-facing shelf near the ORR at Shabad, drawn for the long light of the western evening. Masterplan in progress; first release opens for private preview this season.",
    location: "Shabad, Hyderabad",
    region: "West corridor, near ORR",
    totalAcres: 28,
    status: "UPCOMING",
    accent: "EARTH",
    isPublished: true,
    featured: true,
    sortOrder: 2,
    heroImage: IMG.road,
    coverImage: IMG.road,
    gallery: [IMG.hills, IMG.curve],
    storyEyebrow: "Coming into View",
    storyTitle:
      "A hillside chapter, drawn for the long light of the western evening.",
    storyBody: [
      "Hemadri Hills sits on a gentle west-facing slope, chosen for the evening light and the long view over the Shabad plain. The land rises softly, then holds — a shelf, not a climb.",
      "The masterplan is with our landscape team, and the first release opens for private preview later this season. Every road here will follow the fall of the hill, and every plot will face its own sky.",
    ],
    amenities: [
      "Contour-following internal roads",
      "Native drought-tolerant landscaping",
      "Rainwater harvesting network",
      "Underground electric",
      "Solar street lighting",
      "Common sunset deck at the ridge",
      "Overhead water storage",
      "Managed entrance & security cabin",
    ],
    details: [
      { label: "Total Extent", value: "28 acres" },
      { label: "Plot Sizes", value: "250 – 450 sq. yd" },
      { label: "Road Widths", value: "30 ft" },
      { label: "Status", value: "Private Preview" },
      { label: "DTCP Status", value: "In Process" },
    ],
    advantages: [
      {
        title: "Evening Light",
        body: "A west-facing shelf that holds the long amber hour every evening — a light that no re-orientation can create.",
        image: IMG.field,
      },
      {
        title: "ORR Proximity",
        body: "Twelve minutes from the Outer Ring Road, yet quiet enough that the loudest sound at dusk is a peacock in the neighbouring farm.",
        image: IMG.valley,
      },
      {
        title: "Bedrock Foundation",
        body: "Shallow rock strata under most of the site — a stable, cool base that reduces build costs and keeps homes naturally temperate.",
        image: IMG.road,
      },
      {
        title: "Cleared Lineage",
        body: "Two-generation family holding, cleared through independent legal review before the first drawing was made.",
        image: IMG.boundary,
      },
    ],
    landscape: [
      {
        title: "The Sunset Deck",
        body: "A common sit-out at the highest point of the ridge, held back from the plots. A place to stand and watch the day fold away, quietly.",
        image: IMG.field,
      },
      {
        title: "The West Slope",
        body: "A gentle four-degree fall that catches the evening light across nearly every plot — no correction, no engineering, just orientation.",
        image: IMG.curve,
      },
    ],
    address: "Shabad Mandal, Rangareddy District",
    latitude: 17.12,
    longitude: 78.11,
    nearby: [
      { name: "ORR Junction (Exit 8)", distance: "12 min" },
      { name: "Rajiv Gandhi Intl. Airport", distance: "35 min" },
      { name: "Shabad Town Centre", distance: "8 min" },
    ],
  },
  {
    slug: "hemadri-shores",
    name: "Hemadri Shores",
    tagline: "A lakeside venture, drawings under way.",
    description:
      "Thirty-six acres overlooking a small reservoir on the Nagarjuna Sagar corridor. Forty metres of protected green edge along the waterline; no plot backs onto the lake, and no plot is denied its view.",
    location: "Nagarjuna Sagar Road",
    region: "South-east corridor",
    totalAcres: 36,
    status: "UPCOMING",
    accent: "BARK",
    isPublished: true,
    featured: true,
    sortOrder: 3,
    heroImage: IMG.hills,
    coverImage: IMG.hills,
    gallery: [IMG.boundary, IMG.trees],
    storyEyebrow: "In Quiet Development",
    storyTitle:
      "Drawings under way on the lakeside chapter — patient, unhurried, still.",
    storyBody: [
      "Hemadri Shores looks out over a small reservoir, on land held in the family for two generations. The waterline is protected as green edge — no plot backs on to the lake, and no plot is denied its view.",
      "The masterplan is currently in draft. Register early to receive the first preview, before the layout is published.",
    ],
    amenities: [
      "Protected lake-edge walk",
      "Native lakeside landscaping",
      "Rainwater harvesting network",
      "Common jetty & viewing deck",
      "Underground electric",
      "Solar street lighting",
      "Overhead water storage",
      "Managed entrance & security cabin",
    ],
    details: [
      { label: "Total Extent", value: "36 acres" },
      { label: "Plot Sizes", value: "300 – 600 sq. yd" },
      { label: "Waterfront", value: "410 m of protected edge" },
      { label: "Status", value: "In Planning" },
      { label: "DTCP Status", value: "In Process" },
    ],
    advantages: [
      {
        title: "Lake Frontage",
        body: "A protected, forty-metre green edge along the reservoir — walkable, planted, and held permanently as common land.",
        image: IMG.hills,
      },
      {
        title: "Old Family Holding",
        body: "Two generations under a single title. Cleared, mapped, and preserved without the sub-divisions that trouble neighbouring parcels.",
        image: IMG.boundary,
      },
      {
        title: "Micro-climate",
        body: "The reservoir lowers ambient temperature by two to three degrees through summer — verified over three years of on-site readings.",
        image: IMG.trees,
      },
      {
        title: "Sagar Corridor",
        body: "The Hyderabad-Nagarjuna Sagar highway is receiving quiet infrastructure investment — a slow, patient corridor rather than a loud one.",
        image: IMG.road,
      },
    ],
    landscape: [
      {
        title: "The Lake Walk",
        body: "A shaded walking path along the reservoir edge, kept as common land in perpetuity. No plot backs on to the water, and no plot is denied its view.",
        image: IMG.hills,
      },
      {
        title: "The Viewing Deck",
        body: "A single, quiet timber deck at the widest point of the reservoir. A place for morning tea and evening pause, held for everyone.",
        image: IMG.boundary,
      },
    ],
    address: "Nagarjuna Sagar Road, Rangareddy District",
    latitude: 16.9,
    longitude: 78.5,
    nearby: [
      { name: "Sagar Highway", distance: "5 min" },
      { name: "Rajiv Gandhi Intl. Airport", distance: "60 min" },
    ],
  },
];

/** Sample plots for the open venture, so the plots page is not empty on day one. */
const grovesPlots = [
  { plotNumber: "A-01", sizeSqft: 1800, price: 3600000, facing: "East", status: "AVAILABLE" as const },
  { plotNumber: "A-02", sizeSqft: 1800, price: 3600000, facing: "East", status: "SOLD" as const },
  { plotNumber: "A-07", sizeSqft: 2700, price: 5400000, facing: "North", status: "AVAILABLE" as const },
  { plotNumber: "B-03", sizeSqft: 3600, price: 7200000, facing: "West", status: "RESERVED" as const },
  { plotNumber: "B-11", sizeSqft: 4500, price: 9450000, facing: "North-East", status: "AVAILABLE" as const },
  { plotNumber: "C-04", sizeSqft: 2250, price: 4500000, facing: "South", status: "AVAILABLE" as const },
];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@ownaplot.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(password, 12);

  /**
   * The bootstrap account is a SUPER_ADMIN — the only role that can create the
   * rest of the team and promote a second owner. `update: { role, isActive }`
   * is deliberate: re-running the seed on a database where somebody has
   * accidentally demoted or disabled the owner account will repair it, without
   * touching their password.
   */
  const admin = await prisma.admin.upsert({
    where: { email },
    update: { role: "SUPER_ADMIN", isActive: true },
    create: {
      name: "Admin",
      email,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      jobTitle: "Owner",
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      siteName: "Own A Plot",
      contactEmail: "hello@ownaplot.com",
      contactPhone: "+91 99999 99999",
      address: "6th Floor, Jubilee Hills\nHyderabad, Telangana 500033",
      officeHours: "Mon – Sat, 10am – 7pm",
      footerTagline:
        "Thoughtfully planned land ventures — a quieter, more considered way to own the future.",
      defaultSeoTitle: "Own A Plot — Premium Managed Land Ventures",
      defaultSeoDescription:
        "Thoughtfully planned land ventures designed for tomorrow's growth. Discover verified ventures, transparent ownership, and a life closer to nature.",
      socialLinks: {},
    },
  });

  for (const venture of ventures) {
    const { slug, ...rest } = venture;
    await prisma.project.upsert({
      where: { slug },
      update: rest,
      create: venture,
    });
  }

  const groves = await prisma.project.findUnique({
    where: { slug: "hemadri-groves" },
  });

  if (groves) {
    for (const plot of grovesPlots) {
      await prisma.plot.upsert({
        where: {
          projectId_plotNumber: {
            projectId: groves.id,
            plotNumber: plot.plotNumber,
          },
        },
        update: plot,
        create: { ...plot, projectId: groves.id },
      });
    }
  }

  console.log("─".repeat(60));
  console.log(`Admin:    ${admin.email}`);
  console.log(`Password: ${password}`);
  console.log("Change this password after your first sign-in.");
  console.log("─".repeat(60));
  console.log(`Ventures: ${ventures.length}`);
  console.log(`Plots:    ${grovesPlots.length}`);
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
