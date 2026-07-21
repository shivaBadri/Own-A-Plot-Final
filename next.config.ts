import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Cloudinary already serves derived sizes; these are the widths the layouts
    // actually request, so the optimizer stops generating variants nobody uses.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      // Cloudinary — everything uploaded through the admin.
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Unsplash — the approved design's reference imagery and the CMS defaults.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },

  // Fail the build on lint or type errors. Both default to false in Next 15's
  // template, which is how the delivered project shipped with a broken build.
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },

  // Removes the `X-Powered-By: Next.js` version disclosure.
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  experimental: {
    /**
     * The admin's perceived latency fix, part two.
     *
     * Next 15 sets the client router cache for dynamic segments to 0 seconds,
     * so returning to a page you visited ten seconds ago refetched the entire
     * RSC payload. Every back-navigation in the admin paid full server cost.
     * 30s keeps the admin feeling instant while staying short enough that a
     * colleague's edit shows up on the next glance — and every mutation in
     * this app calls `router.refresh()`, which busts the entry immediately.
     */
    staleTimes: { dynamic: 30, static: 180 },

    /**
     * lucide-react is a barrel of ~1,500 icon modules. Without this, dev
     * compiles walk all of them on every admin page and the production build
     * relies on tree-shaking that Turbopack/webpack do not always achieve
     * across re-exports. This rewrites each import to its direct path.
     */
    optimizePackageImports: ["lucide-react"],
  },

  async redirects() {
    return [
      // The approved frontend routes ventures under /ventures; the original
      // backend used /projects. Anything already pointing at /projects — old
      // links, indexed pages, bookmarks — is moved permanently rather than 404ed.
      { source: "/projects", destination: "/ventures", permanent: true },
      { source: "/projects/:slug", destination: "/ventures/:slug", permanent: true },
      // /admin on its own is not a page.
      { source: "/admin", destination: "/admin/dashboard", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // The admin is never cacheable by a shared proxy — it is per-employee
        // and permission-filtered.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
