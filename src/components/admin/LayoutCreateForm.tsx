"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

interface ProjectOption {
  id: string;
  name: string;
}

/**
 * Creating a layout is not a plain form: the SVG overlay needs the plan's
 * INTRINSIC pixel dimensions to set its viewBox, and the browser is the only
 * place that knows them for free.
 *
 * So the image is loaded into an `Image()` after upload and its naturalWidth /
 * naturalHeight are captured and stored alongside the URL. The alternative —
 * measuring it on the server with sharp, or on every public page load in the
 * browser — is either a new dependency or a layout shift on every visit.
 */
export default function LayoutCreateForm({
  projects,
}: {
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [name, setName] = useState("Master Layout");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function measure(url: string) {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () =>
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Could not read that image."));
      image.src = url;
    });
  }

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setImageUrl(data.url as string);

      // Cloudinary returns the dimensions it measured server-side. Trust those
      // when present and only fall back to loading the image when they are not.
      if (typeof data.width === "number" && typeof data.height === "number") {
        setDimensions({ width: data.width, height: data.height });
      } else {
        setDimensions(await measure(data.url as string));
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleUrlBlur() {
    if (!imageUrl || dimensions) return;
    try {
      setDimensions(await measure(imageUrl));
    } catch {
      setError(
        "That URL did not load as an image. Check it, or upload the file instead."
      );
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!dimensions) {
      setError("Upload the plan image first.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name,
          description,
          imageUrl,
          imageWidth: dimensions.width,
          imageHeight: dimensions.height,
          isPublished: false,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create this layout.");
        setSaving(false);
        return;
      }

      router.push(`/admin/layouts/${data.id}/edit`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 max-w-2xl space-y-10">
      {error && (
        <p
          role="alert"
          className="border border-danger/30 bg-danger/5 px-4 py-3 text-admin-body text-danger"
        >
          {error}
        </p>
      )}

      <label className="block">
        <span className="label-admin">Venture</span>
        <select
          required
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="field-admin mt-2"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label-admin">Plan name</span>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Master Layout — Phase 1"
          className="field-admin mt-2"
        />
        <span className="mt-2 block text-[11px] text-muted">
          Ventures sold in phases can carry several plans; this is the label
          buyers see on the switcher.
        </span>
      </label>

      <label className="block">
        <span className="label-admin">Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="field-admin mt-2 resize-y"
        />
      </label>

      <div>
        <span className="label-admin">Plan image</span>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-admin"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <Upload size={14} strokeWidth={1.5} />
                Upload plan
              </>
            )}
          </button>
        </div>

        <input
          value={imageUrl}
          onChange={(event) => {
            setImageUrl(event.target.value);
            setDimensions(null);
          }}
          onBlur={handleUrlBlur}
          placeholder="…or paste an image URL"
          className="field-admin mt-4"
        />

        {imageUrl && (
          <div className="mt-6 border border-charcoal/10 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Layout preview"
              className="max-h-80 w-full object-contain"
            />
            <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-muted">
              {dimensions
                ? `${dimensions.width} x ${dimensions.height} px`
                : "Measuring…"}
            </p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || uploading || !dimensions}
        className="btn-admin-solid"
      >
        {saving ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Creating
          </>
        ) : (
          "Create and draw boundaries"
        )}
      </button>
    </form>
  );
}
