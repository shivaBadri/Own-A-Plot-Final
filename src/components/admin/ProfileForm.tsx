"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import ImageField from "@/components/admin/fields/ImageField";

interface AdminView {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export default function ProfileForm({ admin }: { admin: AdminView }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [name, setName] = useState(admin.name);
  const [avatarUrl, setAvatarUrl] = useState(admin.avatarUrl ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      setFieldErrors({ confirmPassword: ["Passwords do not match"] });
      return;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          avatarUrl: avatarUrl.trim(),
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not update your profile.");
        setFieldErrors(data.fields ?? {});
        setSaving(false);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
      setSaving(false);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not reach the server. Please try again.");
      setSaving(false);
    }
  }

  const errorFor = (field: string) => fieldErrors[field]?.[0];

  return (
    <form onSubmit={handleSubmit} className="mt-10 max-w-2xl space-y-12">
      <section>
        <h2 className="font-serif text-h4">Details</h2>
        <div className="mt-6 space-y-8">
          <label className="block">
            <span className="label-admin">Name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field-admin mt-2"
            />
            {errorFor("name") && (
              <span className="mt-2 block text-[11px] text-danger">
                {errorFor("name")}
              </span>
            )}
          </label>

          <div>
            <span className="label-admin">Email</span>
            <p className="mt-2 border-b border-charcoal/10 py-2.5 text-admin-body text-muted">
              {admin.email}
            </p>
            <span className="mt-2 block text-[11px] text-muted">
              The sign-in address cannot be changed from here.
            </span>
          </div>

          <ImageField
            label="Avatar"
            value={avatarUrl}
            onChange={setAvatarUrl}
            hint="Square images look best."
          />
        </div>
      </section>

      <section className="border-t border-charcoal/10 pt-10">
        <h2 className="font-serif text-h4">Password</h2>
        <p className="mt-2 text-admin-body text-muted">
          Leave these blank to keep your current password.
        </p>

        <div className="mt-6 space-y-8">
          <label className="block">
            <span className="label-admin">Current password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="field-admin mt-2"
            />
            {errorFor("currentPassword") && (
              <span className="mt-2 block text-[11px] text-danger">
                {errorFor("currentPassword")}
              </span>
            )}
          </label>

          <label className="block">
            <span className="label-admin">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="field-admin mt-2"
            />
            <span className="mt-2 block text-[11px] text-muted">
              At least 8 characters.
            </span>
            {errorFor("newPassword") && (
              <span className="mt-1 block text-[11px] text-danger">
                {errorFor("newPassword")}
              </span>
            )}
          </label>

          <label className="block">
            <span className="label-admin">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="field-admin mt-2"
            />
            {errorFor("confirmPassword") && (
              <span className="mt-2 block text-[11px] text-danger">
                {errorFor("confirmPassword")}
              </span>
            )}
          </label>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="border border-danger/30 bg-danger/5 px-5 py-4 text-admin-body text-danger"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-4 border-t border-charcoal/15 pt-6">
        <button type="submit" disabled={saving} className="btn-admin-solid">
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saved && <Check size={13} />}
          {saving ? "Saving" : saved ? "Saved" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
