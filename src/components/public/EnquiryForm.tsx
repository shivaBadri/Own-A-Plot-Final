"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * The approved enquiry form, made real.
 *
 * The reference implementation called `setState("sent")` on submit and posted
 * nowhere — no enquiry ever reached a database. This version posts to
 * /api/enquiries and surfaces server-side validation errors per field.
 *
 * Two deliberate additions to the approved markup, both forced by the data model:
 *
 *   1. An Email field. `Enquiry.email` is non-null in the schema, and a land
 *      business cannot follow up on a callback request without one. It uses the
 *      identical `.input-luxury` / `.eyebrow` treatment and sits inside the same
 *      two-column grid, so the form's proportions are unchanged.
 *
 *   2. A hidden `company` honeypot, invisible to users, which catches naive bots.
 *
 * Nothing else about the design moved.
 */

export interface VentureOption {
  id: string;
  name: string;
}

type Status = "idle" | "loading" | "sent" | "error";

interface Props {
  /** Labels the enquiry when shown on a venture page. */
  ventureName?: string;
  projectId?: string;
  plotId?: string;
  /** When provided, renders a venture picker instead of a free-text interest. */
  ventures?: VentureOption[];
  compact?: boolean;
  /** Recorded on the enquiry so the team knows which page produced it. */
  source?: string;
}

export default function EnquiryForm({
  ventureName,
  projectId,
  plotId,
  ventures,
  compact = false,
  source,
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);

    const payload = {
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      message: String(form.get("message") ?? "").trim() || undefined,
      interest: String(form.get("interest") ?? "").trim() || ventureName,
      company: String(form.get("company") ?? ""),
      source:
        source ??
        (typeof window !== "undefined" ? window.location.pathname : undefined),
      projectId: (ventures ? selectedProjectId : projectId) || undefined,
      plotId: plotId || undefined,
    };

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          fields?: Record<string, string[]>;
        };
        setFieldErrors(data.fields ?? {});
        setMessage(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch {
      setMessage(
        "We could not reach the server. Please check your connection and try again."
      );
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div
        data-reveal
        className="border border-charcoal/10 bg-cream p-10 text-charcoal md:p-14"
      >
        <p className="eyebrow">Thank you</p>
        <h3 className="mt-4 font-serif text-h3">
          We&rsquo;ll be in touch, quietly and soon.
        </h3>
        <p className="prose-max mt-6 text-body text-muted">
          A member of the team will call you within one working day to arrange a
          private walk of the land.
        </p>
      </div>
    );
  }

  const errorFor = (field: string) => fieldErrors[field]?.[0];

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`relative border border-charcoal/10 bg-cream ${
        compact ? "p-8" : "p-10 md:p-14"
      }`}
      data-reveal
    >
      <p className="eyebrow">Private Enquiry</p>
      <h3 className="mt-3 font-serif text-h3">Request a Callback</h3>
      <p className="prose-max mt-4 text-body text-muted">
        Share a few details and a member of the team will call to arrange a
        visit. No sales pressure — just a quiet conversation.
      </p>

      {/* Honeypot — hidden from users, irresistible to bots. */}
      <div className="absolute h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="company">Company</label>
        <input
          id="company"
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
        <label className="block">
          <span className="eyebrow">Name</span>
          <input
            required
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Your full name"
            aria-invalid={Boolean(errorFor("name"))}
            className="input-luxury mt-2"
          />
          {errorFor("name") && (
            <span className="mt-2 block text-body-sm text-danger">
              {errorFor("name")}
            </span>
          )}
        </label>

        <label className="block">
          <span className="eyebrow">Mobile</span>
          <input
            required
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="+91"
            aria-invalid={Boolean(errorFor("phone"))}
            className="input-luxury mt-2"
          />
          {errorFor("phone") && (
            <span className="mt-2 block text-body-sm text-danger">
              {errorFor("phone")}
            </span>
          )}
        </label>

        <label className="block md:col-span-2">
          <span className="eyebrow">Email</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errorFor("email"))}
            className="input-luxury mt-2"
          />
          {errorFor("email") && (
            <span className="mt-2 block text-body-sm text-danger">
              {errorFor("email")}
            </span>
          )}
        </label>

        <label className="block md:col-span-2">
          <span className="eyebrow">Interest</span>
          {ventures && ventures.length > 0 ? (
            <select
              name="ventureSelect"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="input-luxury mt-2 appearance-none"
            >
              <option value="">Any venture — still deciding</option>
              {ventures.map((venture) => (
                <option key={venture.id} value={venture.id}>
                  {venture.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="interest"
              defaultValue={ventureName ?? ""}
              placeholder={ventureName ?? "The venture you have in mind"}
              className="input-luxury mt-2"
            />
          )}
        </label>

        <label className="block md:col-span-2">
          <span className="eyebrow">Message</span>
          <textarea
            name="message"
            rows={3}
            placeholder="Anything you'd like us to know before we call"
            className="input-luxury mt-2 resize-none"
          />
        </label>
      </div>

      {status === "error" && message && (
        <p
          role="alert"
          className="mt-8 border border-danger/30 bg-danger/5 px-5 py-4 text-body-sm text-danger"
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-luxury group mt-10"
      >
        {status === "loading" ? "Sending" : "Request Callback"}
        {status === "loading" ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ArrowRight
            size={16}
            className="transition-transform duration-500 group-hover:translate-x-1"
          />
        )}
      </button>
    </form>
  );
}
