import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Metadata is generated, not static, so that Settings → SEO in the admin is the
 * single source of truth for titles and descriptions across the whole site.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: settings.defaultSeoTitle,
      template: `%s — ${settings.siteName}`,
    },
    description: settings.defaultSeoDescription,
    openGraph: {
      type: "website",
      siteName: settings.siteName,
      title: settings.defaultSeoTitle,
      description: settings.defaultSeoDescription,
      url: siteUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: settings.defaultSeoTitle,
      description: settings.defaultSeoDescription,
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-sans text-body antialiased">{children}</body>
    </html>
  );
}
