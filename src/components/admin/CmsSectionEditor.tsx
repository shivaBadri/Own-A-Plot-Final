"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Loader2, Check, RotateCcw } from "lucide-react";
import type { CmsSectionDef } from "@/lib/cms";
import ImageField from "@/components/admin/fields/ImageField";
import StringListField from "@/components/admin/fields/StringListField";
import RowsField, { type Row } from "@/components/admin/fields/RowsField";

/**
 * Renders one CMS section's form from its field descriptors.
 *
 * The editor holds the DEFAULT merged with whatever is stored, so the fields are
 * never blank and an admin can see exactly what the live site is showing before
 * they change it. "Reset to default" puts a section back to the approved copy.
 */
export default function CmsSectionEditor({
  section,
  initialContent,
  defaults,
}: {
  section: CmsSectionDef;
  initialContent: Record<string, unknown>;
  defaults: Record<string, unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({
    ...defaults,
    ...initialContent,
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  function set(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/cms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: section.key, content: values }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save");
      }
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      setStatus("error");
    }
  }

  function reset() {
    if (
      !window.confirm(
        `Reset "${section.label}" to the original approved copy? Your changes to this section will be lost.`
      )
    )
      return;
    setValues({ ...defaults });
    setStatus("idle");
  }

  const asString = (name: string) =>
    typeof values[name] === "string" ? (values[name] as string) : "";
  const asList = (name: string) =>
    Array.isArray(values[name]) ? (values[name] as string[]) : [];
  const asRows = (name: string) =>
    Array.isArray(values[name]) ? (values[name] as Row[]) : [];

  return (
    <section className="border border-charcoal/10 bg-cream">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 p-6 text-left md:p-8"
      >
        <span className="min-w-0">
          <span className="block font-serif text-h4">{section.label}</span>
          <span className="mt-1 block text-admin-body text-muted">
            {section.description}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted transition-transform duration-500 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-charcoal/10 p-6 md:p-8">
          <div className="space-y-8">
            {section.fields.map((field) => {
              if (field.type === "image") {
                return (
                  <ImageField
                    key={field.name}
                    label={field.label}
                    value={asString(field.name)}
                    onChange={(url) => set(field.name, url)}
                    hint={field.hint}
                  />
                );
              }

              if (field.type === "list") {
                return (
                  <StringListField
                    key={field.name}
                    label={field.label}
                    values={asList(field.name)}
                    onChange={(next) => set(field.name, next)}
                    multiline
                    hint={field.hint}
                  />
                );
              }

              if (field.type === "richlist") {
                return (
                  <RowsField
                    key={field.name}
                    label={field.label}
                    hint={field.hint}
                    keys={field.rowKeys ?? []}
                    rows={asRows(field.name)}
                    onChange={(next) => set(field.name, next)}
                  />
                );
              }

              if (field.type === "textarea") {
                return (
                  <label key={field.name} className="block">
                    <span className="label-admin">{field.label}</span>
                    <textarea
                      rows={3}
                      value={asString(field.name)}
                      onChange={(event) => set(field.name, event.target.value)}
                      className="field-admin-boxed mt-2 resize-y"
                    />
                  </label>
                );
              }

              return (
                <label key={field.name} className="block">
                  <span className="label-admin">{field.label}</span>
                  <input
                    value={asString(field.name)}
                    onChange={(event) => set(field.name, event.target.value)}
                    className="field-admin mt-2"
                  />
                </label>
              );
            })}
          </div>

          {status === "error" && error && (
            <p
              role="alert"
              className="mt-8 border border-danger/30 bg-danger/5 px-5 py-3 text-admin-body text-danger"
            >
              {error}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-charcoal/10 pt-6">
            <button
              type="button"
              onClick={save}
              disabled={status === "saving"}
              className="btn-admin-solid"
            >
              {status === "saving" && (
                <Loader2 size={13} className="animate-spin" />
              )}
              {status === "saved" && <Check size={13} />}
              {status === "saving"
                ? "Saving"
                : status === "saved"
                  ? "Saved"
                  : "Save section"}
            </button>

            <button type="button" onClick={reset} className="btn-admin-ghost">
              <RotateCcw size={13} />
              Reset to default
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
