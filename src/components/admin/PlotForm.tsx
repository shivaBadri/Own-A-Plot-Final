"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import type { Plot } from "@prisma/client";
import type { ProjectOption } from "@/types";
import {
  PLOT_STATUS_ORDER,
  PLOT_STATUS_STYLES,
  type PlotStatus,
} from "@/lib/layout";

export default function PlotForm({
  plot,
  projects,
}: {
  plot?: Plot;
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(plot);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [projectId, setProjectId] = useState(
    plot?.projectId ?? projects[0]?.id ?? ""
  );
  const [plotNumber, setPlotNumber] = useState(plot?.plotNumber ?? "");
  const [sizeSqft, setSizeSqft] = useState(
    plot?.sizeSqft != null ? String(plot.sizeSqft) : ""
  );
  const [price, setPrice] = useState(
    plot?.price != null ? String(plot.price) : ""
  );
  const [priceOnRequest, setPriceOnRequest] = useState(
    plot?.priceOnRequest ?? false
  );
  const [status, setStatus] = useState(plot?.status ?? "AVAILABLE");
  const [facing, setFacing] = useState(plot?.facing ?? "");
  const [dimensions, setDimensions] = useState(plot?.dimensions ?? "");
  const [description, setDescription] = useState(plot?.description ?? "");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const payload = {
      projectId,
      plotNumber: plotNumber.trim(),
      sizeSqft: Number(sizeSqft),
      // A price-on-request plot still stores 0 rather than null, so the column
      // stays non-null and sorting by price never has to cope with holes.
      price: priceOnRequest ? 0 : Number(price),
      priceOnRequest,
      status,
      facing: facing.trim(),
      dimensions: dimensions.trim(),
      description: description.trim(),
    };

    try {
      const res = await fetch(isEdit ? `/api/plots/${plot!.id}` : "/api/plots", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not save the plot.");
        setFieldErrors(data.fields ?? {});
        setSaving(false);
        return;
      }

      router.push("/admin/plots");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!plot) return;
    if (!window.confirm(`Delete plot ${plot.plotNumber}? This cannot be undone.`))
      return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/plots/${plot.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      router.push("/admin/plots");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  const errorFor = (field: string) => fieldErrors[field]?.[0];

  if (projects.length === 0) {
    return (
      <div className="mt-10 border border-charcoal/10 bg-sand/15 px-8 py-16 text-center">
        <p className="font-serif text-h3">No ventures yet.</p>
        <p className="prose-max mx-auto mt-4 text-admin-body text-muted">
          A plot has to belong to a venture. Create one first.
        </p>
        <Link href="/admin/projects/new" className="btn-admin mt-8">
          Create a venture
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 max-w-3xl">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <label className="block md:col-span-2">
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
          {errorFor("projectId") && (
            <span className="mt-2 block text-[11px] text-danger">
              {errorFor("projectId")}
            </span>
          )}
        </label>

        <label className="block">
          <span className="label-admin">Plot number</span>
          <input
            required
            value={plotNumber}
            onChange={(event) => setPlotNumber(event.target.value)}
            placeholder="A-14"
            className="field-admin mt-2"
          />
          <span className="mt-2 block text-[11px] text-muted">
            Must be unique inside the venture.
          </span>
          {errorFor("plotNumber") && (
            <span className="mt-1 block text-[11px] text-danger">
              {errorFor("plotNumber")}
            </span>
          )}
        </label>

        <label className="block">
          <span className="label-admin">Size (sq ft)</span>
          <input
            required
            type="number"
            min="1"
            step="1"
            value={sizeSqft}
            onChange={(event) => setSizeSqft(event.target.value)}
            placeholder="2400"
            className="field-admin mt-2"
          />
          {errorFor("sizeSqft") && (
            <span className="mt-2 block text-[11px] text-danger">
              {errorFor("sizeSqft")}
            </span>
          )}
        </label>

        <label className="block">
          <span className="label-admin">Price (₹)</span>
          <input
            type="number"
            min="0"
            step="1000"
            value={priceOnRequest ? "" : price}
            disabled={priceOnRequest}
            required={!priceOnRequest}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="4500000"
            className="field-admin mt-2"
          />
          {errorFor("price") && (
            <span className="mt-2 block text-[11px] text-danger">
              {errorFor("price")}
            </span>
          )}
        </label>

        <label className="flex cursor-pointer items-center gap-3 pt-6">
          <input
            type="checkbox"
            checked={priceOnRequest}
            onChange={(event) => setPriceOnRequest(event.target.checked)}
            className="h-4 w-4 accent-olive"
          />
          <span className="text-admin-body">
            Price on enquiry
            <span className="mt-0.5 block text-[11px] text-muted">
              Hides the figure and shows “On enquiry”.
            </span>
          </span>
        </label>

        <label className="block">
          <span className="label-admin">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="field-admin mt-2"
          >
            {PLOT_STATUS_ORDER.map((option) => (
              <option key={option} value={option}>
                {PLOT_STATUS_STYLES[option].label}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-[11px] text-muted">
            {PLOT_STATUS_STYLES[status as PlotStatus].description} This is the
            colour the plot is painted on the interactive master layout.
          </span>
        </label>

        <label className="block">
          <span className="label-admin">Dimensions</span>
          <input
            value={dimensions}
            onChange={(event) => setDimensions(event.target.value)}
            placeholder="30 x 40 ft"
            className="field-admin mt-2"
          />
          <span className="mt-2 block text-[11px] text-muted">
            Shown in the master-layout popup. Free text — write what the site
            plan says.
          </span>
        </label>

        <label className="block">
          <span className="label-admin">Facing</span>
          <input
            value={facing}
            onChange={(event) => setFacing(event.target.value)}
            placeholder="East"
            className="field-admin mt-2"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="label-admin">Description</span>
          <textarea
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Anything specific to this plot — the corner position, the old tamarind on its boundary."
            className="field-admin-boxed mt-2 resize-y"
          />
        </label>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-10 border border-danger/30 bg-danger/5 px-5 py-4 text-admin-body text-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-charcoal/15 pt-6">
        <button type="submit" disabled={saving} className="btn-admin-solid">
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? "Saving" : isEdit ? "Save changes" : "Create plot"}
        </button>

        <Link href="/admin/plots" className="btn-admin-ghost">
          Cancel
        </Link>

        {isEdit && (
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
        )}
      </div>
    </form>
  );
}
