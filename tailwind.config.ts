// Design tokens are governed by ui.md (rules 1, 3, 4, 9) and are lifted verbatim
// from the approved Own A Plot frontend. All font sizes are fluid clamp() values;
// do not add fixed-px font sizes. Interaction transitions stay in the 300–800ms band.
//
// The admin UI reuses these exact tokens — there is no second palette, no second
// type scale, and no admin-only font.
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F7F4EC",
        sand: "#D8C8A8",
        charcoal: "#111111",
        muted: "#77736B",
        olive: "#5F6F45",
        earth: "#8A6542",
        bark: "#382D1D",
        loam: "#4D3D25",
        // Stage 4 — a single warm gold accent, formalised from the value the
        // interactive layout already used for its highlight stroke. Kept as one
        // token so the "brown & gold" direction stays disciplined.
        gold: "#B98C1E",
        "gold-soft": "#D6A62E",
        // Semantic states — the only additions, needed for admin status chips.
        // Chosen to sit inside the earthen palette rather than beside it.
        success: "#5F6F45",
        warning: "#8A6542",
        danger: "#8C3A2B",
      },
      boxShadow: {
        // Stage 4 — soft, warm-tinted elevation for floating cards and panels.
        soft: "0 8px 24px rgba(43, 43, 39, 0.08)",
        float: "0 18px 48px -12px rgba(43, 43, 39, 0.18)",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Cormorant Garamond", "Libre Baskerville", "serif"],
        sans: ["var(--font-inter)", "Inter", "Helvetica Neue", "sans-serif"],
      },
      // Fluid type scale — governed by ui.md rules 1 & 3. Do not add fixed-px fontSize.
      fontSize: {
        hero: ["clamp(3rem, 9vw, 7.5rem)", { lineHeight: "1.02", fontWeight: "400", letterSpacing: "-0.01em" }],
        h1: ["clamp(2.5rem, 5.5vw, 4.5rem)", { lineHeight: "1.08", fontWeight: "400" }],
        h2: ["clamp(1.875rem, 3.5vw, 2.75rem)", { lineHeight: "1.15", fontWeight: "400" }],
        h3: ["clamp(1.5rem, 2.5vw, 2rem)", { lineHeight: "1.2", fontWeight: "400" }],
        h4: ["clamp(1.125rem, 1.8vw, 1.5rem)", { lineHeight: "1.25", fontWeight: "400" }],
        body: ["clamp(1rem, 0.5vw + 0.85rem, 1.25rem)", { lineHeight: "1.6" }],
        "body-sm": ["clamp(0.875rem, 0.3vw + 0.8rem, 1rem)", { lineHeight: "1.55" }],
        // Admin runs denser than the public site — same scale, one step tighter.
        "admin-h1": ["clamp(1.75rem, 2.4vw, 2.25rem)", { lineHeight: "1.15", fontWeight: "400" }],
        "admin-body": ["clamp(0.875rem, 0.25vw + 0.8rem, 0.9375rem)", { lineHeight: "1.55" }],
      },
      // ui.md rule 9 caps interactions at 800ms.
      transitionDuration: {
        800: "800ms",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slowZoom: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.08)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        fadeUp: "fadeUp 900ms cubic-bezier(0.22, 1, 0.36, 1) both",
        fadeIn: "fadeIn 900ms ease-out both",
        slowZoom: "slowZoom 12s ease-out both",
        shimmer: "shimmer 1600ms linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
