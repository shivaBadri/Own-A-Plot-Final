"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import {
  PLOT_STATUS_ORDER,
  PLOT_STATUS_STYLES,
  type PlotStatus,
} from "@/lib/layout";
import { formatPrice, formatSqft } from "@/lib/format";

export interface PlotRow {
  id: string;
  plotNumber: string;
  projectName: string;
  sizeSqft: number;
  price: number;
  priceOnRequest: boolean;
  facing: string | null;
  status: PlotStatus;
}

/**
 * The admin plots table with multi-select and a bulk-update bar.
 *
 * Selection is page-local client state; the bar only offers changes, so an
 * empty selection can never accidentally touch a row. Applying sends one
 * request to `/api/plots/bulk` and then refreshes the server component, so the
 * table reflects the write without a full reload.
 */
export default function PlotsBulkTable({ plots }: { plots: PlotRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<PlotStatus | "">("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allOnPage = useMemo(() => plots.map((plot) => plot.id), [plots]);
  const allSelected =
    selected.size > 0 && allOnPage.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  }

  function toggleAll() {
    setSelected((current) => {
      if (allOnPage.every((id) => current.has(id))) return new Set();
      return new Set(allOnPage);
    });
    setError(null);
  }

  function clear() {
    setSelected(new Set());
    setStatus("");
    setError(null);
  }

  async function apply() {
    if (selected.size === 0 || !status) return;
    setApplying(true);
    setError(null);

    try {
      const res = await fetch("/api/plots/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not update the selected plots.");
        setApplying(false);
        return;
      }
      clear();
      setApplying(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setApplying(false);
    }
  }

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 mt-10 flex flex-wrap items-center gap-4 border border-charcoal/20 bg-cream px-5 py-4 shadow-[0_8px_24px_rgba(43,43,39,0.08)]">
          <span className="text-[11px] uppercase tracking-[0.22em] text-charcoal">
            {selected.size} selected
          </span>

          <label className="flex items-center gap-2">
            <span className="label-admin">Set status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as PlotStatus | "")}
              className="field-admin py-1.5"
            >
              <option value="">Choose…</option>
              {PLOT_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {PLOT_STATUS_STYLES[s].label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={apply}
            disabled={applying || !status}
            className="btn-admin-solid"
          >
            {applying ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Applying
              </>
            ) : (
              "Apply"
            )}
          </button>

          <button
            type="button"
            onClick={clear}
            className="btn-admin-ghost ml-auto"
          >
            <X size={13} strokeWidth={1.5} />
            Clear
          </button>

          {error && (
            <p role="alert" className="w-full text-[12px] text-danger">
              {error}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="table-admin min-w-[820px]">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 accent-loam"
                />
              </th>
              <th>Plot</th>
              <th>Venture</th>
              <th>Size</th>
              <th>Price</th>
              <th>Facing</th>
              <th>Status</th>
              <th className="sr-only">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plots.map((plot) => {
              const isChecked = selected.has(plot.id);
              return (
                <tr
                  key={plot.id}
                  className={isChecked ? "bg-sand/25" : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select plot ${plot.plotNumber}`}
                      checked={isChecked}
                      onChange={() => toggle(plot.id)}
                      className="h-4 w-4 accent-loam"
                    />
                  </td>
                  <td>
                    <Link
                      href={`/admin/plots/${plot.id}/edit`}
                      className="link-underline font-serif text-base"
                    >
                      {plot.plotNumber}
                    </Link>
                  </td>
                  <td className="text-muted">{plot.projectName}</td>
                  <td className="whitespace-nowrap">
                    {formatSqft(plot.sizeSqft)}
                  </td>
                  <td className="whitespace-nowrap">
                    {plot.priceOnRequest ? (
                      <span className="text-muted">On enquiry</span>
                    ) : (
                      formatPrice(plot.price)
                    )}
                  </td>
                  <td className="text-muted">{plot.facing ?? "—"}</td>
                  <td>
                    <span className="chip border-charcoal/20">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 shrink-0"
                        style={{
                          backgroundColor: PLOT_STATUS_STYLES[plot.status].swatch,
                        }}
                      />
                      {PLOT_STATUS_STYLES[plot.status].label}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/admin/plots/${plot.id}/edit`}
                      className="link-underline whitespace-nowrap text-[10px] uppercase tracking-[0.22em]"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
