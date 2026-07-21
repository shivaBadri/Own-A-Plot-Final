"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Plus, X, ChevronUp, ChevronDown, Upload, Loader2 } from "lucide-react";

/**
 * Generic repeatable-row editor. Backs the four JSON columns:
 *   advantages  -> { title, body, image }
 *   landscape   -> { title, body, image }
 *   details     -> { label, value }
 *   nearby      -> { name, distance }
 *
 * One component rather than four near-identical ones, because the only thing
 * that differs between them is the set of keys per row.
 */

export interface RowKeyDef {
  name: string;
  label: string;
  type?: "text" | "textarea" | "image";
  placeholder?: string;
}

export type Row = Record<string, string>;

function RowImage({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (res.ok) onChange(data.url as string);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value && (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-charcoal/15">
          <Image
            src={value}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <input
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://…"
        className="field-admin"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Upload image"
        className="flex h-9 w-9 shrink-0 items-center justify-center border border-charcoal/20 text-muted transition-colors duration-500 hover:border-charcoal hover:text-charcoal disabled:opacity-40"
      >
        {uploading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Upload size={13} />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}

export default function RowsField({
  label,
  hint,
  keys,
  rows,
  onChange,
  addLabel = "Add row",
}: {
  label: string;
  hint?: string;
  keys: RowKeyDef[];
  rows: Row[];
  onChange: (rows: Row[]) => void;
  addLabel?: string;
}) {
  function update(index: number, key: string, value: string) {
    const next = rows.map((row, i) =>
      i === index ? { ...row, [key]: value } : row
    );
    onChange(next);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    const blank: Row = {};
    for (const key of keys) blank[key.name] = "";
    onChange([...rows, blank]);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="label-admin">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>

      <div className="mt-4 space-y-4">
        {rows.map((row, index) => (
          <div
            key={index}
            className="border border-charcoal/12 bg-sand/10 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.28em] text-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-charcoal disabled:opacity-25"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === rows.length - 1}
                  aria-label="Move down"
                  className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-charcoal disabled:opacity-25"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  aria-label="Remove row"
                  className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-danger"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {keys.map((key) => (
                <div
                  key={key.name}
                  className={
                    key.type === "textarea" || key.type === "image"
                      ? "md:col-span-2"
                      : ""
                  }
                >
                  <span className="label-admin">{key.label}</span>
                  <div className="mt-2">
                    {key.type === "image" ? (
                      <RowImage
                        value={row[key.name] ?? ""}
                        onChange={(url) => update(index, key.name, url)}
                      />
                    ) : key.type === "textarea" ? (
                      <textarea
                        rows={3}
                        value={row[key.name] ?? ""}
                        onChange={(event) =>
                          update(index, key.name, event.target.value)
                        }
                        placeholder={key.placeholder}
                        className="field-admin-boxed resize-y"
                      />
                    ) : (
                      <input
                        type="text"
                        value={row[key.name] ?? ""}
                        onChange={(event) =>
                          update(index, key.name, event.target.value)
                        }
                        placeholder={key.placeholder}
                        className="field-admin"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={add} className="btn-admin-ghost mt-4 !px-0">
        <Plus size={13} />
        {addLabel}
      </button>
    </div>
  );
}
