"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Upload, X, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";

/**
 * Ordered image gallery. Order matters — the venture page uses gallery[0] as the
 * large editorial image and gallery[1] as the inset — so reordering is exposed.
 * Uploads go straight to Cloudinary and land in the media library too.
 */
export default function GalleryField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);
    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        uploaded.push(data.url as string);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    }

    if (uploaded.length > 0) onChange([...values, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="label-admin">{label}</span>
        <span className="text-[11px] text-muted">
          First two images anchor the venture page layout.
        </span>
      </div>

      {values.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {values.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="group relative aspect-square overflow-hidden border border-charcoal/15 bg-sand/20"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="160px"
                className="object-cover"
                unoptimized
              />

              <span className="absolute left-1.5 top-1.5 bg-charcoal/70 px-1.5 py-0.5 text-[9px] tracking-[0.2em] text-cream">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-charcoal/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move left"
                  className="flex h-8 w-8 items-center justify-center text-cream disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(values.filter((_, i) => i !== index))}
                  aria-label="Remove image"
                  className="flex h-8 w-8 items-center justify-center text-cream hover:text-danger"
                >
                  <X size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === values.length - 1}
                  aria-label="Move right"
                  className="flex h-8 w-8 items-center justify-center text-cream disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-admin"
        >
          {uploading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Upload size={13} />
          )}
          {uploading ? "Uploading" : "Upload images"}
        </button>

        <div className="flex flex-1 items-center gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(event) => setManualUrl(event.target.value)}
            placeholder="…or paste an image URL"
            className="field-admin"
          />
          <button
            type="button"
            onClick={() => {
              const url = manualUrl.trim();
              if (!url) return;
              onChange([...values, url]);
              setManualUrl("");
            }}
            disabled={!manualUrl.trim()}
            aria-label="Add image URL"
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-charcoal/20 text-muted transition-colors duration-500 hover:border-charcoal hover:text-charcoal disabled:opacity-30"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-[11px] text-danger" role="alert">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) void handleFiles(event.target.files);
        }}
      />
    </div>
  );
}
