"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

/**
 * Publish and delete, split out of the editor so that saving boundaries and
 * changing visibility stay separate actions. A designer mid-trace should never
 * be one keystroke away from pushing a half-drawn plan live.
 */
export default function LayoutPublishControls({
  layoutId,
  isPublished,
  canPublish,
  canDelete,
  shapeCount,
}: {
  layoutId: string;
  isPublished: boolean;
  canPublish: boolean;
  canDelete: boolean;
  shapeCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function togglePublish() {
    if (!isPublished && shapeCount === 0) {
      setError("Draw at least one boundary before publishing this plan.");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/layouts/${layoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !isPublished }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? "Could not change visibility.");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        "Delete this plan and every boundary on it? The uploaded image stays in the media library."
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/layouts/${layoutId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not delete this layout.");
      setBusy(false);
      return;
    }
    router.push("/admin/layouts");
    router.refresh();
  }

  return (
    <>
      <span className={isPublished ? "chip-live" : "chip-neutral"}>
        {isPublished ? "Live" : "Draft"}
      </span>

      {canPublish && (
        <button
          type="button"
          onClick={togglePublish}
          disabled={busy}
          className={isPublished ? "btn-admin" : "btn-admin-solid"}
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {isPublished ? "Unpublish" : "Publish plan"}
        </button>
      )}

      {canDelete && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="btn-admin-danger"
        >
          <Trash2 size={13} strokeWidth={1.5} />
          Delete
        </button>
      )}

      {error && (
        <p role="alert" className="w-full text-admin-body text-danger">
          {error}
        </p>
      )}
    </>
  );
}
