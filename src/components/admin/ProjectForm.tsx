"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Upload, Trash2 } from "lucide-react";
import type { Project } from "@prisma/client";
import { slugify, formatBytes } from "@/lib/format";
import ImageField from "@/components/admin/fields/ImageField";
import StringListField from "@/components/admin/fields/StringListField";
import GalleryField from "@/components/admin/fields/GalleryField";
import RowsField, { type Row } from "@/components/admin/fields/RowsField";

/**
 * The venture editor.
 *
 * The original form covered eight columns. The approved frontend renders about
 * thirty fields per venture — everything from the story paragraphs to the
 * "Reachable From" distances. If those are not editable here, the public pages
 * are not really database-driven; they are just a seed script with extra steps.
 * So all of them are here, grouped into the same sections the public page has.
 */

type Section = "essentials" | "editorial" | "land" | "location" | "seo";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "essentials", label: "Essentials" },
  { id: "editorial", label: "Story & Imagery" },
  { id: "land", label: "The Land" },
  { id: "location", label: "Location & Brochure" },
  { id: "seo", label: "Publishing & SEO" },
];

function asRows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Row => typeof item === "object" && item !== null
  );
}

export default function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const isEdit = Boolean(project);

  const [section, setSection] = useState<Section>("essentials");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Essentials
  const [name, setName] = useState(project?.name ?? "");
  const [slug, setSlug] = useState(project?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(project));
  const [tagline, setTagline] = useState(project?.tagline ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [location, setLocation] = useState(project?.location ?? "");
  const [region, setRegion] = useState(project?.region ?? "");
  const [totalAcres, setTotalAcres] = useState(
    project?.totalAcres != null ? String(project.totalAcres) : ""
  );
  const [status, setStatus] = useState(project?.status ?? "UPCOMING");
  const [accent, setAccent] = useState(project?.accent ?? "OLIVE");

  // Editorial
  const [heroImage, setHeroImage] = useState(project?.heroImage ?? "");
  const [heroVideo, setHeroVideo] = useState(project?.heroVideo ?? "");
  const [coverImage, setCoverImage] = useState(project?.coverImage ?? "");
  const [gallery, setGallery] = useState<string[]>(project?.gallery ?? []);
  const [storyEyebrow, setStoryEyebrow] = useState(project?.storyEyebrow ?? "");
  const [storyTitle, setStoryTitle] = useState(project?.storyTitle ?? "");
  const [storyBody, setStoryBody] = useState<string[]>(project?.storyBody ?? []);

  // The land
  const [amenities, setAmenities] = useState<string[]>(project?.amenities ?? []);
  const [details, setDetails] = useState<Row[]>(asRows(project?.details));
  const [advantages, setAdvantages] = useState<Row[]>(asRows(project?.advantages));
  const [landscape, setLandscape] = useState<Row[]>(asRows(project?.landscape));

  // Location & brochure
  const [address, setAddress] = useState(project?.address ?? "");
  const [latitude, setLatitude] = useState(
    project?.latitude != null ? String(project.latitude) : ""
  );
  const [longitude, setLongitude] = useState(
    project?.longitude != null ? String(project.longitude) : ""
  );
  const [mapEmbed, setMapEmbed] = useState(project?.mapEmbed ?? "");
  const [nearby, setNearby] = useState<Row[]>(asRows(project?.nearby));
  const [brochureUrl, setBrochureUrl] = useState(project?.brochureUrl ?? "");
  const [brochureFileName, setBrochureFileName] = useState(
    project?.brochureFileName ?? ""
  );
  const [brochureFileSize, setBrochureFileSize] = useState(
    project?.brochureFileSize ?? ""
  );
  const [brochureUploading, setBrochureUploading] = useState(false);
  const brochureRef = useRef<HTMLInputElement>(null);

  // Publishing & SEO
  const [isPublished, setIsPublished] = useState(project?.isPublished ?? false);
  const [featured, setFeatured] = useState(project?.featured ?? false);
  const [sortOrder, setSortOrder] = useState(String(project?.sortOrder ?? 0));
  const [seoTitle, setSeoTitle] = useState(project?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    project?.seoDescription ?? ""
  );

  async function uploadBrochure(file: File) {
    setBrochureUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setBrochureUrl(data.url as string);
      setBrochureFileName(file.name);
      setBrochureFileSize(formatBytes(file.size));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Brochure upload failed");
    } finally {
      setBrochureUploading(false);
      if (brochureRef.current) brochureRef.current.value = "";
    }
  }

  function toNumberOrNull(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      location: location.trim(),
      status,
      accent,
      tagline: tagline.trim(),
      region: region.trim(),
      totalAcres: toNumberOrNull(totalAcres),
      heroImage: heroImage.trim(),
      heroVideo: heroVideo.trim(),
      coverImage: coverImage.trim(),
      gallery: gallery.filter(Boolean),
      storyEyebrow: storyEyebrow.trim(),
      storyTitle: storyTitle.trim(),
      storyBody: storyBody.map((p) => p.trim()).filter(Boolean),
      amenities: amenities.map((a) => a.trim()).filter(Boolean),
      // Rows whose required key is empty are dropped rather than rejected — an
      // admin who added a blank row and forgot about it should still be able
      // to save.
      details: details.filter((row) => row.label?.trim()),
      advantages: advantages.filter((row) => row.title?.trim()),
      landscape: landscape.filter((row) => row.title?.trim()),
      nearby: nearby.filter((row) => row.name?.trim()),
      address: address.trim(),
      latitude: toNumberOrNull(latitude),
      longitude: toNumberOrNull(longitude),
      mapEmbed: mapEmbed.trim(),
      brochureUrl: brochureUrl.trim(),
      brochureFileName: brochureFileName.trim(),
      brochureFileSize: brochureFileSize.trim(),
      isPublished,
      featured,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      seoTitle: seoTitle.trim(),
      seoDescription: seoDescription.trim(),
    };

    try {
      const res = await fetch(
        isEdit ? `/api/projects/${project!.id}` : "/api/projects",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not save the venture.");
        setFieldErrors(data.fields ?? {});
        setSaving(false);
        return;
      }

      router.push("/admin/projects");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!project) return;
    const confirmed = window.confirm(
      `Delete "${project.name}"? Its plots will be deleted too. Enquiries are kept but will no longer be linked to it. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.push("/admin/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  const errorFor = (field: string) => fieldErrors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} className="mt-10">
      {/* Section tabs */}
      <div className="flex flex-wrap gap-x-8 gap-y-3 border-b border-charcoal/20 pb-3">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            aria-current={section === item.id ? "true" : undefined}
            className={`text-[10px] uppercase tracking-[0.28em] transition-colors duration-500 ${
              section === item.id
                ? "text-charcoal"
                : "text-muted hover:text-charcoal"
            }`}
          >
            {item.label}
            {section === item.id && (
              <span className="mt-2 block h-px bg-charcoal" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-10 space-y-10">
        {/* ESSENTIALS */}
        {section === "essentials" && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <label className="block">
              <span className="label-admin">Name</span>
              <input
                required
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!slugTouched) setSlug(slugify(event.target.value));
                }}
                placeholder="Hemadri Groves"
                className="field-admin mt-2"
              />
              {errorFor("name") && (
                <span className="mt-2 block text-[11px] text-danger">
                  {errorFor("name")}
                </span>
              )}
            </label>

            <label className="block">
              <span className="label-admin">Slug</span>
              <input
                required
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
                placeholder="hemadri-groves"
                className="field-admin mt-2"
              />
              <span className="mt-2 block text-[11px] text-muted">
                /ventures/{slug || "…"}
              </span>
              {errorFor("slug") && (
                <span className="mt-1 block text-[11px] text-danger">
                  {errorFor("slug")}
                </span>
              )}
            </label>

            <label className="block md:col-span-2">
              <span className="label-admin">Tagline</span>
              <input
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                placeholder="A quiet grove between two hills, held for the long view."
                className="field-admin mt-2"
              />
              <span className="mt-2 block text-[11px] text-muted">
                The one line under the venture name on the hero and the listing.
              </span>
            </label>

            <label className="block md:col-span-2">
              <span className="label-admin">Description</span>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Used for SEO and as a fallback wherever the tagline is empty."
                className="field-admin-boxed mt-2 resize-y"
              />
              {errorFor("description") && (
                <span className="mt-2 block text-[11px] text-danger">
                  {errorFor("description")}
                </span>
              )}
            </label>

            <label className="block">
              <span className="label-admin">Location (corridor)</span>
              <input
                required
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Kadthal, Hyderabad"
                className="field-admin mt-2"
              />
            </label>

            <label className="block">
              <span className="label-admin">Region</span>
              <input
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder="South of the city, 45 minutes from the airport"
                className="field-admin mt-2"
              />
            </label>

            <label className="block">
              <span className="label-admin">Total extent (acres)</span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={totalAcres}
                onChange={(event) => setTotalAcres(event.target.value)}
                placeholder="42"
                className="field-admin mt-2"
              />
            </label>

            <div className="grid grid-cols-2 gap-8">
              <label className="block">
                <span className="label-admin">Status</span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as typeof status)
                  }
                  className="field-admin mt-2"
                >
                  <option value="UPCOMING">Upcoming — “Coming soon”</option>
                  <option value="ONGOING">Ongoing — “Now open”</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>

              <label className="block">
                <span className="label-admin">Accent</span>
                <select
                  value={accent}
                  onChange={(event) =>
                    setAccent(event.target.value as typeof accent)
                  }
                  className="field-admin mt-2"
                >
                  <option value="OLIVE">Olive</option>
                  <option value="EARTH">Earth</option>
                  <option value="BARK">Bark</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* EDITORIAL */}
        {section === "editorial" && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <ImageField
                label="Hero image"
                value={heroImage}
                onChange={setHeroImage}
                hint="Full-bleed. Falls back to the cover image."
              />
              <ImageField
                label="Cover image"
                value={coverImage}
                onChange={setCoverImage}
                hint="Used in cards and previews."
              />
            </div>

            <label className="block">
              <span className="label-admin">Hero video URL (optional)</span>
              <input
                type="url"
                value={heroVideo}
                onChange={(event) => setHeroVideo(event.target.value)}
                placeholder="https://…/venture.mp4"
                className="field-admin mt-2"
              />
              <span className="mt-2 block text-[11px] text-muted">
                Plays muted and looped over the hero. The hero image becomes its
                poster frame.
              </span>
            </label>

            <GalleryField label="Gallery" values={gallery} onChange={setGallery} />

            <div className="border-t border-charcoal/10 pt-10">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <label className="block">
                  <span className="label-admin">Story eyebrow</span>
                  <input
                    value={storyEyebrow}
                    onChange={(event) => setStoryEyebrow(event.target.value)}
                    placeholder="The Ground Beneath"
                    className="field-admin mt-2"
                  />
                </label>
                <label className="block">
                  <span className="label-admin">Story title</span>
                  <input
                    value={storyTitle}
                    onChange={(event) => setStoryTitle(event.target.value)}
                    placeholder="Forty-two acres of gentle slope…"
                    className="field-admin mt-2"
                  />
                </label>
              </div>

              <div className="mt-8">
                <StringListField
                  label="Story paragraphs"
                  values={storyBody}
                  onChange={setStoryBody}
                  multiline
                  placeholder="A paragraph of the venture's story…"
                  hint="Rendered in order."
                />
              </div>
            </div>
          </div>
        )}

        {/* THE LAND */}
        {section === "land" && (
          <div className="space-y-12">
            <StringListField
              label="Amenities"
              values={amenities}
              onChange={setAmenities}
              placeholder="Metalled internal roads, 30 ft & 40 ft"
            />

            <div className="border-t border-charcoal/10 pt-10">
              <RowsField
                label="The layout, in numbers"
                hint="Rendered as a definition list on the venture page."
                keys={[
                  { name: "label", label: "Label", placeholder: "Total Extent" },
                  { name: "value", label: "Value", placeholder: "42 acres" },
                ]}
                rows={details}
                onChange={setDetails}
                addLabel="Add detail"
              />
            </div>

            <div className="border-t border-charcoal/10 pt-10">
              <RowsField
                label="Location advantages"
                hint="The hover-swap block. Each row needs an image."
                keys={[
                  { name: "title", label: "Title", placeholder: "Water Table at 40 ft" },
                  { name: "body", label: "Body", type: "textarea" },
                  { name: "image", label: "Image", type: "image" },
                ]}
                rows={advantages}
                onChange={setAdvantages}
                addLabel="Add advantage"
              />
            </div>

            <div className="border-t border-charcoal/10 pt-10">
              <RowsField
                label="Landscape rows"
                hint="Full-width alternating editorial rows."
                keys={[
                  { name: "title", label: "Title", placeholder: "The Grove at the Centre" },
                  { name: "body", label: "Body", type: "textarea" },
                  { name: "image", label: "Image", type: "image" },
                ]}
                rows={landscape}
                onChange={setLandscape}
                addLabel="Add landscape row"
              />
            </div>
          </div>
        )}

        {/* LOCATION & BROCHURE */}
        {section === "location" && (
          <div className="space-y-10">
            <label className="block">
              <span className="label-admin">Address</span>
              <textarea
                rows={2}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Survey No. 214/A & 215, Hemadri Village, Kadthal Mandal"
                className="field-admin-boxed mt-2 resize-y"
              />
            </label>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <label className="block">
                <span className="label-admin">Latitude</span>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  placeholder="17.048"
                  className="field-admin mt-2"
                />
              </label>
              <label className="block">
                <span className="label-admin">Longitude</span>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  placeholder="78.401"
                  className="field-admin mt-2"
                />
              </label>
            </div>

            <label className="block">
              <span className="label-admin">Google Maps embed URL</span>
              <input
                value={mapEmbed}
                onChange={(event) => setMapEmbed(event.target.value)}
                placeholder="https://www.google.com/maps/embed?pb=…"
                className="field-admin mt-2"
              />
              <span className="mt-2 block text-[11px] text-muted">
                In Google Maps: Share → Embed a map → copy the src from the iframe.
                Leave empty to show “Map on private preview”.
              </span>
            </label>

            <div className="border-t border-charcoal/10 pt-10">
              <RowsField
                label="Reachable from"
                keys={[
                  { name: "name", label: "Place", placeholder: "Rajiv Gandhi Intl. Airport" },
                  { name: "distance", label: "Distance", placeholder: "45 min" },
                ]}
                rows={nearby}
                onChange={setNearby}
                addLabel="Add place"
              />
            </div>

            {/* Brochure */}
            <div className="border-t border-charcoal/10 pt-10">
              <span className="label-admin">Brochure (PDF)</span>

              {brochureUrl ? (
                <div className="mt-4 flex flex-col gap-4 border border-charcoal/12 bg-sand/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <a
                      href={brochureUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="link-underline block truncate font-serif text-base"
                    >
                      {brochureFileName || "Brochure.pdf"}
                    </a>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-muted">
                      PDF · {brochureFileSize || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBrochureUrl("");
                      setBrochureFileName("");
                      setBrochureFileSize("");
                    }}
                    className="btn-admin-ghost shrink-0"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => brochureRef.current?.click()}
                    disabled={brochureUploading}
                    className="btn-admin"
                  >
                    {brochureUploading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Upload size={13} />
                    )}
                    {brochureUploading ? "Uploading" : "Upload brochure"}
                  </button>
                  <p className="mt-3 text-[11px] text-muted">
                    PDF, up to 25MB. Until one is uploaded, the venture page shows
                    a “Request the Brochure” button instead of a download.
                  </p>
                </div>
              )}

              <input
                ref={brochureRef}
                type="file"
                accept="application/pdf"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadBrochure(file);
                }}
              />
            </div>
          </div>
        )}

        {/* PUBLISHING & SEO */}
        {section === "seo" && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-4 border border-charcoal/12 p-5">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(event) => setIsPublished(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-olive"
                />
                <span>
                  <span className="block font-serif text-base">Published</span>
                  <span className="mt-1 block text-[11px] text-muted">
                    Unpublished ventures are invisible to the public and 404 on a
                    direct URL.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-4 border border-charcoal/12 p-5">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-olive"
                />
                <span>
                  <span className="block font-serif text-base">Featured</span>
                  <span className="mt-1 block text-[11px] text-muted">
                    Shows in the homepage grid. If nothing is featured, the newest
                    three published ventures are used.
                  </span>
                </span>
              </label>
            </div>

            <label className="block max-w-xs">
              <span className="label-admin">Sort order</span>
              <input
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="field-admin mt-2"
              />
              <span className="mt-2 block text-[11px] text-muted">
                Lower numbers appear first across every listing.
              </span>
            </label>

            <div className="border-t border-charcoal/10 pt-10">
              <label className="block">
                <span className="label-admin">SEO title</span>
                <input
                  value={seoTitle}
                  onChange={(event) => setSeoTitle(event.target.value)}
                  placeholder={name || "Defaults to the venture name"}
                  className="field-admin mt-2"
                />
              </label>

              <label className="mt-8 block">
                <span className="label-admin">SEO description</span>
                <textarea
                  rows={3}
                  value={seoDescription}
                  onChange={(event) => setSeoDescription(event.target.value)}
                  placeholder="Defaults to the tagline."
                  className="field-admin-boxed mt-2 resize-y"
                />
                <span className="mt-2 block text-[11px] text-muted">
                  {seoDescription.length} characters — around 155 reads best in
                  search results.
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-10 border border-danger/30 bg-danger/5 px-5 py-4 text-admin-body text-danger"
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="sticky bottom-0 mt-12 flex flex-wrap items-center gap-4 border-t border-charcoal/15 bg-cream py-6">
        <button type="submit" disabled={saving} className="btn-admin-solid">
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving
            ? "Saving"
            : isEdit
              ? "Save changes"
              : "Create venture"}
        </button>

        <Link href="/admin/projects" className="btn-admin-ghost">
          Cancel
        </Link>

        {isEdit && (
          <>
            <Link
              href={`/ventures/${project!.slug}`}
              target="_blank"
              className="btn-admin-ghost"
            >
              Preview
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="btn-admin-danger ml-auto"
            >
              {deleting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              {deleting ? "Deleting" : "Delete"}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
