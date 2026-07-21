"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? "").trim(),
          password: String(form.get("password") ?? ""),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Invalid credentials");
        setLoading(false);
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        redirectTo?: string;
      };

      // `from` is attacker-controllable via the query string. Only same-origin
      // admin paths are accepted, so a crafted link cannot bounce a freshly
      // authenticated admin to an external site.
      //
      // The server also returns `redirectTo` — the first page this employee's
      // ROLE can actually open. A Layout Designer has no dashboard, so falling
      // back to a hardcoded /admin/dashboard would bounce them straight into a
      // permission error on their own login.
      const from = searchParams.get("from");
      const fallback = data.redirectTo ?? "/admin/dashboard";
      const target =
        from && from.startsWith("/admin") && !from.startsWith("//")
          ? from
          : fallback;

      router.push(target);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5 py-16">
      <div className="w-full max-w-md">
        <div className="text-center">
          <p className="font-serif text-h2">Own A Plot</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.32em] text-muted">
            Administration
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-12 border border-charcoal/10 bg-cream p-8 md:p-10"
        >
          <p className="eyebrow">Sign in</p>
          <h1 className="mt-3 font-serif text-h3">Welcome back.</h1>

          <div className="mt-10 space-y-8">
            <label className="block">
              <span className="eyebrow">Email</span>
              <input
                required
                type="email"
                name="email"
                autoComplete="username"
                autoFocus
                placeholder="you@ownaplot.com"
                className="input-luxury mt-2"
              />
            </label>

            <label className="block">
              <span className="eyebrow">Password</span>
              <input
                required
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-luxury mt-2"
              />
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-8 border border-danger/30 bg-danger/5 px-4 py-3 text-body-sm text-danger"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-luxury group mt-10 w-full"
          >
            {loading ? "Signing in" : "Sign in"}
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRight
                size={16}
                className="transition-transform duration-500 group-hover:translate-x-1"
              />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
