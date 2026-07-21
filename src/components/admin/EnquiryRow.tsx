"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, Loader2, Trash2, Check } from "lucide-react";
import type { EnquiryStatus } from "@prisma/client";

/**
 * An enquiry row that expands.
 *
 * The original enquiries table showed name / contact / status and dropped the
 * message entirely — the single most important field on the record was never
 * rendered anywhere in the product. Here it is, along with an editable internal
 * note and the page the enquiry came from.
 *
 * Dates arrive pre-formatted from the server. Formatting a Date in a client
 * component with the browser's locale, when the server rendered it with the
 * server's, is a guaranteed hydration mismatch.
 */

interface EnquiryView {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  interest: string | null;
  source: string | null;
  notes: string | null;
  status: EnquiryStatus;
  createdAt: string;
  projectName: string | null;
  plotNumber: string | null;
}

const STATUSES: EnquiryStatus[] = ["NEW", "CONTACTED", "CLOSED"];

export default function EnquiryRow({ enquiry }: { enquiry: EnquiryView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(enquiry.status);
  const [notes, setNotes] = useState(enquiry.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/enquiries/${enquiry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Update failed");
  }

  async function changeStatus(next: EnquiryStatus) {
    const previous = status;
    setStatus(next); // Optimistic.
    try {
      await patch({ status: next });
      startTransition(() => router.refresh());
    } catch {
      setStatus(previous); // Roll back — the badge must not lie.
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      await patch({ notes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete the enquiry from ${enquiry.name}?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/enquiries/${enquiry.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      startTransition(() => router.refresh());
    } catch {
      setDeleting(false);
    }
  }

  const chip =
    status === "NEW"
      ? "chip-live"
      : status === "CONTACTED"
        ? "chip-warn"
        : "chip-neutral";

  const target = [enquiry.projectName, enquiry.plotNumber ? `Plot ${enquiry.plotNumber}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={isPending ? "opacity-60 transition-opacity" : ""}>
      <div className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:gap-8">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-4 text-left"
        >
          <ChevronDown
            size={15}
            className={`shrink-0 text-muted transition-transform duration-500 ${
              open ? "rotate-180" : ""
            }`}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-serif text-base">
              {enquiry.name}
            </span>
            <span className="mt-0.5 block truncate text-[11px] uppercase tracking-[0.2em] text-muted">
              {target || enquiry.interest || "General enquiry"}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-6 pl-9 md:pl-0">
          <span className="hidden whitespace-nowrap text-[10px] uppercase tracking-[0.22em] text-muted lg:block">
            {enquiry.createdAt}
          </span>
          <span className={chip}>{status}</span>
          <select
            value={status}
            onChange={(event) =>
              void changeStatus(event.target.value as EnquiryStatus)
            }
            aria-label={`Status for ${enquiry.name}`}
            className="border-0 border-b border-charcoal/25 bg-transparent py-1.5 pl-0 pr-6 text-[10px] uppercase tracking-[0.22em] text-charcoal focus:border-charcoal focus:outline-none focus:ring-0"
          >
            {STATUSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-1 gap-8 border-t border-charcoal/10 bg-sand/10 p-6 md:grid-cols-2 md:p-8">
          <div className="space-y-5">
            <div>
              <p className="label-admin">Contact</p>
              <a
                href={`mailto:${enquiry.email}`}
                className="link-underline mt-2 block break-all text-admin-body"
              >
                {enquiry.email}
              </a>
              <a
                href={`tel:${enquiry.phone.replace(/[^\d+]/g, "")}`}
                className="link-underline mt-1 block text-admin-body"
              >
                {enquiry.phone}
              </a>
            </div>

            <div>
              <p className="label-admin">Message</p>
              <p className="mt-2 whitespace-pre-line text-admin-body text-muted">
                {enquiry.message?.trim() || "— no message left —"}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <p className="label-admin">Received</p>
                <p className="mt-1.5 text-admin-body text-muted">
                  {enquiry.createdAt}
                </p>
              </div>
              {enquiry.source && (
                <div>
                  <p className="label-admin">From page</p>
                  <p className="mt-1.5 text-admin-body text-muted">
                    {enquiry.source}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className="flex flex-1 flex-col">
              <span className="label-admin">Internal note</span>
              <textarea
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Called Tuesday — site visit booked for the 14th."
                className="field-admin-boxed mt-2 flex-1 resize-y"
              />
            </label>

            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={saveNotes}
                disabled={savingNotes || notes === (enquiry.notes ?? "")}
                className="btn-admin"
              >
                {savingNotes && <Loader2 size={13} className="animate-spin" />}
                {notesSaved && <Check size={13} />}
                {savingNotes ? "Saving" : notesSaved ? "Saved" : "Save note"}
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn-admin-ghost ml-auto text-danger hover:border-danger/40"
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
      )}
    </li>
  );
}
