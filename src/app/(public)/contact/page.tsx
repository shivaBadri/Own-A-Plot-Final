import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCmsSection } from "@/lib/cms";
import { getSettings, telHref } from "@/lib/settings";
import EnquiryForm from "@/components/public/EnquiryForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [cms, settings] = await Promise.all([
    getCmsSection("contactPage"),
    getSettings(),
  ]);
  return {
    title: "Contact",
    description: cms.intro || settings.defaultSeoDescription,
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const [cms, settings, projects] = await Promise.all([
    getCmsSection("contactPage"),
    getSettings(),
    prisma.project.findMany({
      where: { isPublished: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <>
      {/* Header */}
      <section className="pt-40 md:pt-48">
        <div className="container-page">
          <p className="eyebrow animate-fadeIn">{cms.eyebrow}</p>
          <h1 className="mt-6 max-w-3xl animate-fadeUp font-serif text-h1 leading-[1.05]">
            {cms.title}
          </h1>
          <p className="prose-max mt-8 animate-fadeUp text-body text-muted [animation-delay:120ms]">
            {cms.intro}
          </p>
        </div>
      </section>

      <section className="section-y">
        <div className="container-page grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">
          <div data-reveal className="lg:col-span-5">
            <p className="eyebrow">Reach Us Directly</p>
            <ul className="mt-10 space-y-8">
              <li className="flex items-start gap-5">
                <Phone size={18} strokeWidth={1.2} className="mt-1 shrink-0" />
                <div>
                  <p className="eyebrow">Phone</p>
                  <a
                    href={telHref(settings.contactPhone)}
                    className="link-underline mt-2 block font-serif text-h4"
                  >
                    {settings.contactPhone}
                  </a>
                  <p className="mt-1 text-sm text-muted">
                    {settings.officeHours}
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-5">
                <Mail size={18} strokeWidth={1.2} className="mt-1 shrink-0" />
                <div>
                  <p className="eyebrow">Email</p>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="link-underline mt-2 block break-all font-serif text-h4"
                  >
                    {settings.contactEmail}
                  </a>
                  <p className="mt-1 text-sm text-muted">
                    We reply within a working day.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-5">
                <MapPin size={18} strokeWidth={1.2} className="mt-1 shrink-0" />
                <div>
                  <p className="eyebrow">Studio</p>
                  <p className="mt-2 font-serif text-h4">
                    {settings.siteName} Studio
                  </p>
                  <p className="mt-1 whitespace-pre-line text-body text-muted">
                    {settings.address}
                  </p>
                </div>
              </li>
            </ul>

            <div className="mt-16 border-t border-charcoal/10 pt-8">
              <p className="eyebrow">{cms.visitNoteTitle}</p>
              <p className="prose-max mt-4 text-body text-muted">
                {cms.visitNoteBody}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <EnquiryForm ventures={projects} source="/contact" />
          </div>
        </div>
      </section>
    </>
  );
}
