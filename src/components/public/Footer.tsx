import Link from "next/link";
import { adminLoginUrl } from "@/lib/admin-url";
import type { ResolvedSettings } from "@/lib/settings";
import { telHref } from "@/lib/settings";

export interface FooterVenture {
  slug: string;
  name: string;
}

/**
 * Approved footer. Ventures, contact details, and the tagline now come from the
 * database (Projects + SiteSettings) rather than being hard-coded.
 */
export default function Footer({
  ventures,
  settings,
}: {
  ventures: FooterVenture[];
  settings: ResolvedSettings;
}) {
  const social = Object.entries(settings.socialLinks).filter(([, href]) => href);

  return (
    <footer className="bg-loam text-cream">
      <div className="container-page grid grid-cols-1 gap-16 py-20 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-h3 leading-tight">{settings.siteName}</p>
          <p className="prose-max mt-6 text-body text-cream/70">
            {settings.footerTagline}
          </p>
          <div className="mt-8 flex items-center gap-4">
            <span className="block h-px w-12 bg-cream/40" />
            <p className="text-[11px] uppercase tracking-[0.32em] text-cream/60">
              Est. In the Country
            </p>
          </div>

          {social.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-6">
              {social.map(([name, href]) => (
                <li key={name}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline text-[11px] uppercase tracking-[0.28em] text-cream/70"
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-5 text-[11px] uppercase tracking-[0.32em] text-cream/60">
            Ventures
          </p>
          <ul className="space-y-3 text-sm">
            {ventures.map((v) => (
              <li key={v.slug}>
                <Link
                  href={`/ventures/${v.slug}`}
                  className="link-underline text-cream"
                >
                  {v.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/ventures" className="link-underline text-cream">
                All Ventures
              </Link>
            </li>
            <li>
              <Link href="/plots" className="link-underline text-cream">
                Available Plots
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-5 text-[11px] uppercase tracking-[0.32em] text-cream/60">
            Company
          </p>
          <ul className="space-y-3 text-sm">
            <li>
              <Link href="/about" className="link-underline text-cream">
                About
              </Link>
            </li>
            <li>
              <a
                href={adminLoginUrl()}
                className="link-underline text-cream/45 transition-colors duration-500 hover:text-cream"
              >
                Admin
              </a>
            </li>
            <li>
              <Link href="/contact" className="link-underline text-cream">
                Contact
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${settings.contactEmail}`}
                className="link-underline text-cream"
              >
                {settings.contactEmail}
              </a>
            </li>
            <li>
              <a
                href={telHref(settings.contactPhone)}
                className="link-underline text-cream"
              >
                {settings.contactPhone}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/15">
        <div className="container-page flex flex-col items-start justify-between gap-3 py-6 text-xs uppercase tracking-[0.22em] text-cream/60 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} {settings.siteName}. All rights
            reserved.
          </p>
          <p>Curated with intention.</p>
        </div>
      </div>
    </footer>
  );
}
