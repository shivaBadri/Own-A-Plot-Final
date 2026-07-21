"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  Upload,
  Trash2,
  Loader2,
  Copy,
  Check,
  FileText,
  X,
} from "lucide-react";
import type { MediaKind } from "@prisma/client";

export interface MediaView {
  id: string;
  url: string;
  alt: string | null;
  kind: MediaKind;
  fileName: string | null;
  size: string;
  dimensions: string | null;
  createdAt: string;
}

/**
 * The media library, completed.
 *
 * The original page could show a grid and nothing else — there was no delete
 * endpoint, no alt-text editing, no way to copy a URL out, and PDFs could not
 * be uploaded at all. All four are here now.
 */
export default function MediaLibrary({
  items,
  isFiltered,
}: {
  items: MediaView[];
  isFiltered: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaView | null>(null);
  const [, startTransition] = useTransition();

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-admin-solid"
        >
          {uploading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Upload size={13} />
          )}
          {uploading ? "Uploading" : "Upload files"}
        </button>
        <span className="text-[11px] text-muted">
          Images up to 10MB · PDFs up to 25MB
        </span>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 border border-danger/30 bg-danger/5 px-5 py-3 text-admin-body text-danger"
        >
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) void handleFiles(event.target.files);
        }}
      />

      {items.length === 0 ? (
        <div className="mt-10 border border-charcoal/10 bg-sand/15 px-8 py-20 text-center">
          <p className="font-serif text-h3">
            {isFiltered ? "Nothing matches that." : "The library is empty."}
          </p>
          <p className="prose-max mx-auto mt-4 text-admin-body text-muted">
            {isFiltered
              ? "Try a different search."
              : "Upload images and brochures here, or straight from a venture's form."}
          </p>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
              >
                <span className="relative block aspect-square overflow-hidden border border-charcoal/12 bg-sand/20">
                  {item.kind === "IMAGE" ? (
                    <Image
                      src={item.url}
                      alt={item.alt ?? ""}
                      fill
                      sizes="(min-width: 1280px) 16vw, (min-width: 640px) 25vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full flex-col items-center justify-center gap-3 text-muted">
                      <FileText size={28} strokeWidth={1.2} />
                      <span className="text-[10px] uppercase tracking-[0.22em]">
                        PDF
                      </span>
                    </span>
                  )}
                </span>
                <span className="mt-2 block truncate text-[11px] text-muted">
                  {item.fileName ?? item.alt ?? "Untitled"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <MediaDetail
          item={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </>
  );
}

function MediaDetail({
  item,
  onClose,
  onChanged,
}: {
  item: MediaView;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [alt, setAlt] = useState(item.alt ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/media/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt }),
      });
      if (!res.ok) throw new Error("Could not save");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        "Delete this file? It will be removed from Cloudinary as well, and any page still pointing at it will show a broken image."
      )
    )
      return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media detail"
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm"
      />

      <div className="relative grid max-h-[90vh] w-full max-w-3xl grid-cols-1 overflow-y-auto border border-charcoal/15 bg-cream md:grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center bg-cream/80 text-charcoal backdrop-blur-sm"
        >
          <X size={18} />
        </button>

        <div className="relative aspect-square bg-sand/25">
          {item.kind === "IMAGE" ? (
            <Image
              src={item.url}
              alt={item.alt ?? ""}
              fill
              sizes="400px"
              className="object-contain"
              unoptimized
            />
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-full flex-col items-center justify-center gap-4 text-muted transition-colors hover:text-charcoal"
            >
              <FileText size={48} strokeWidth={1} />
              <span className="text-[11px] uppercase tracking-[0.22em]">
                Open PDF
              </span>
            </a>
          )}
        </div>

        <div className="flex flex-col p-8">
          <p className="label-admin">File</p>
          <p className="mt-2 break-all font-serif text-base">
            {item.fileName ?? "Untitled"}
          </p>

          <dl className="mt-6 space-y-3 text-[11px] uppercase tracking-[0.2em] text-muted">
            <div className="flex justify-between gap-4">
              <dt>Size</dt>
              <dd className="text-charcoal">{item.size}</dd>
            </div>
            {item.dimensions && (
              <div className="flex justify-between gap-4">
                <dt>Dimensions</dt>
                <dd className="text-charcoal">{item.dimensions}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt>Uploaded</dt>
              <dd className="text-charcoal">{item.createdAt}</dd>
            </div>
          </dl>

          <label className="mt-8 block">
            <span className="label-admin">Alt text</span>
            <input
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              placeholder="Describe the image for screen readers"
              className="field-admin mt-2"
            />
          </label>

          <button
            type="button"
            onClick={copy}
            className="btn-admin-ghost mt-4 !px-0"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy URL"}
          </button>

          {error && (
            <p className="mt-4 text-[11px] text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="mt-auto flex items-center gap-4 pt-8">
            <button
              type="button"
              onClick={save}
              disabled={saving || alt === (item.alt ?? "")}
              className="btn-admin-solid"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? "Saving" : "Save"}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="btn-admin-danger ml-auto"
            >
              {deleting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
