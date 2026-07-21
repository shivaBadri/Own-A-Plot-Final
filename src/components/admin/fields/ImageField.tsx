"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";

/**
 * A URL field that can also upload.
 *
 * Both halves matter: an admin migrating existing content pastes a URL, an
 * admin adding a new photo picks a file. The original admin had only a bare
 * text input and no way to get an image into Cloudinary from the form at all.
 */
export default function ImageField({
  label,
  value,
  onChange,
  hint,
  accept = "image/*",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="label-admin">{label}</span>

      <div className="mt-2 flex items-start gap-4">
        {value && (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-charcoal/15 bg-sand/20">
            <Image
              src={value}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              // A pasted URL from an unregistered host would otherwise crash the
              // Next Image loader. Unoptimized keeps the preview resilient.
              unoptimized
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://…"
              className="field-admin"
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                aria-label={`Clear ${label}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center border border-charcoal/20 text-muted transition-colors duration-500 hover:border-charcoal hover:text-charcoal"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="btn-admin-ghost !px-0"
            >
              {uploading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Upload size={13} />
              )}
              {uploading ? "Uploading" : "Upload"}
            </button>
            {hint && <span className="text-[11px] text-muted">{hint}</span>}
          </div>

          {error && (
            <p className="mt-2 text-[11px] text-danger" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
