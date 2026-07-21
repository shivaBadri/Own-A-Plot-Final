"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, Check, Trash2, KeyRound } from "lucide-react";
import ImageField from "@/components/admin/fields/ImageField";
import {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  RESOURCES,
  RESOURCE_LABELS,
  RESOURCE_ACTIONS,
  ACTION_LABELS,
  permissionsForRole,
  type Role,
  type Permission,
} from "@/lib/permissions";

export interface EmployeeView {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  isActive: boolean;
  phone: string | null;
  jobTitle: string | null;
  permissionGrants: string[];
  permissionRevokes: string[];
  mustChangePassword: boolean;
}

interface Props {
  employee?: EmployeeView;
  /** Permissions the SIGNED-IN user holds — you cannot grant what you lack. */
  actorPermissions: string[];
  actorIsSuperAdmin: boolean;
  /** True when the form is editing the signed-in user's own record. */
  isSelf: boolean;
  canDelete: boolean;
}

function randomPassword() {
  const alphabet =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => alphabet[v % alphabet.length]).join("");
}

export default function EmployeeForm({
  employee,
  actorPermissions,
  actorIsSuperAdmin,
  isSelf,
  canDelete,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(employee);

  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [jobTitle, setJobTitle] = useState(employee?.jobTitle ?? "");
  const [avatarUrl, setAvatarUrl] = useState(employee?.avatarUrl ?? "");
  const [role, setRole] = useState<Role>(employee?.role ?? "SALES_EXECUTIVE");
  const [isActive, setIsActive] = useState(employee?.isActive ?? true);
  const [password, setPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(
    employee?.mustChangePassword ?? true
  );
  const [grants, setGrants] = useState<string[]>(
    employee?.permissionGrants ?? []
  );
  const [revokes, setRevokes] = useState<string[]>(
    employee?.permissionRevokes ?? []
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const actorGranted = useMemo(
    () => new Set(actorPermissions),
    [actorPermissions]
  );

  /** Role defaults for the currently selected role. */
  const roleDefaults = useMemo(
    () => new Set<string>(permissionsForRole(role)),
    [role]
  );

  /** What this employee would end up with: defaults + grants − revokes. */
  const effective = useMemo(() => {
    const set = new Set(roleDefaults);
    if (role !== "SUPER_ADMIN") {
      for (const grant of grants) set.add(grant);
      for (const revoke of revokes) set.delete(revoke);
    }
    return set;
  }, [roleDefaults, grants, revokes, role]);

  const availableRoles = ROLES.filter(
    (candidate) => candidate !== "SUPER_ADMIN" || actorIsSuperAdmin
  );

  function togglePermission(permission: Permission) {
    const isDefault = roleDefaults.has(permission);
    const on = effective.has(permission);

    if (on) {
      // Turning something OFF: drop an explicit grant, or add a revoke if it
      // came from the role.
      setGrants((prev) => prev.filter((p) => p !== permission));
      if (isDefault) setRevokes((prev) => [...new Set([...prev, permission])]);
    } else {
      setRevokes((prev) => prev.filter((p) => p !== permission));
      if (!isDefault) setGrants((prev) => [...new Set([...prev, permission])]);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const payload: Record<string, unknown> = {
      name,
      email,
      role,
      phone,
      jobTitle,
      avatarUrl: avatarUrl || undefined,
      isActive,
      permissionGrants: grants,
      permissionRevokes: revokes,
      mustChangePassword,
    };
    if (!isEdit) payload.password = password;

    try {
      const res = await fetch(
        isEdit ? `/api/employees/${employee!.id}` : "/api/employees",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Could not save this employee.");
        setSaving(false);
        return;
      }

      setSaved(true);
      setSaving(false);
      router.refresh();
      if (!isEdit) router.push(`/admin/employees/${data.id}/edit`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!employee) return;
    setResetting(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employee.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: resetPassword,
          mustChangePassword: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not reset the password.");
      } else {
        setResetOpen(false);
        setResetPassword("");
        router.refresh();
      }
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    if (!employee) return;
    if (
      !confirm(
        `Delete ${employee.name}? Their activity history is kept, but the account is gone for good. Deactivating is usually what you want.`
      )
    ) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not delete this employee.");
      setSaving(false);
      return;
    }
    router.push("/admin/employees");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-14">
      {error && (
        <p
          role="alert"
          className="border border-danger/30 bg-danger/5 px-4 py-3 text-admin-body text-danger"
        >
          {error}
        </p>
      )}

      {/* ---- Identity ---- */}
      <section>
        <h2 className="font-serif text-h4">Details</h2>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          <label className="block">
            <span className="label-admin">Full name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field-admin mt-2"
              placeholder="Priya Nair"
            />
          </label>

          <label className="block">
            <span className="label-admin">Work email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-admin mt-2"
              placeholder="priya@ownaplot.com"
            />
          </label>

          <label className="block">
            <span className="label-admin">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="field-admin mt-2"
              placeholder="+91 90000 00000"
            />
          </label>

          <label className="block">
            <span className="label-admin">Job title</span>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="field-admin mt-2"
              placeholder="Senior Sales Executive"
            />
          </label>
        </div>

        <div className="mt-10">
          <ImageField
            label="Avatar"
            value={avatarUrl}
            onChange={(url) => setAvatarUrl(url)}
          />
        </div>
      </section>

      {/* ---- Credentials ---- */}
      {!isEdit && (
        <section className="border-t border-charcoal/10 pt-10">
          <h2 className="font-serif text-h4">First password</h2>
          <p className="prose-max mt-3 text-admin-body text-muted">
            Share this once, over a channel you trust. They will be asked to
            change it the first time they sign in.
          </p>

          <div className="mt-8 flex flex-wrap items-end gap-4">
            <label className="block min-w-[18rem] flex-1">
              <span className="label-admin">Password</span>
              <input
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field-admin mt-2 font-mono"
                placeholder="At least 10 characters"
              />
            </label>
            <button
              type="button"
              onClick={() => setPassword(randomPassword())}
              className="btn-admin"
            >
              Generate
            </button>
          </div>

          <label className="mt-8 flex items-center gap-3">
            <input
              type="checkbox"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
              className="h-4 w-4 accent-charcoal"
            />
            <span className="text-admin-body">
              Require a password change on first sign-in
            </span>
          </label>
        </section>
      )}

      {/* ---- Role ---- */}
      <section className="border-t border-charcoal/10 pt-10">
        <h2 className="font-serif text-h4">Role</h2>
        <p className="prose-max mt-3 text-admin-body text-muted">
          The role sets the baseline. Adjust individual permissions below only
          when someone genuinely needs an exception.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-px border border-charcoal/10 bg-charcoal/10 md:grid-cols-2">
          {availableRoles.map((candidate) => {
            const selected = role === candidate;
            const locked = isSelf;
            return (
              <label
                key={candidate}
                className={`flex cursor-pointer gap-4 bg-cream p-6 transition-colors duration-300 ${
                  selected ? "bg-sand/30" : "hover:bg-sand/15"
                } ${locked ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={candidate}
                  checked={selected}
                  disabled={locked}
                  onChange={() => {
                    setRole(candidate);
                    // Overrides are relative to a role; carrying them across a
                    // role change would silently reinstate access the new role
                    // was chosen to remove.
                    setGrants([]);
                    setRevokes([]);
                  }}
                  className="mt-1 h-4 w-4 shrink-0 accent-charcoal"
                />
                <span className="min-w-0">
                  <span className="block font-serif text-base">
                    {ROLE_LABELS[candidate]}
                  </span>
                  <span className="mt-1 block text-[12px] leading-relaxed text-muted">
                    {ROLE_DESCRIPTIONS[candidate]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {isSelf && (
          <p className="mt-4 text-admin-body text-muted">
            You cannot change your own role. Ask another Super Admin.
          </p>
        )}
      </section>

      {/* ---- Permission matrix ---- */}
      <section className="border-t border-charcoal/10 pt-10">
        <h2 className="font-serif text-h4">Permissions</h2>
        <p className="prose-max mt-3 text-admin-body text-muted">
          {role === "SUPER_ADMIN"
            ? "A Super Admin holds every permission and cannot be restricted — that is what makes it the account that can undo mistakes."
            : "Ticked boxes that differ from the role default are stored as an explicit exception on this employee."}
        </p>

        <div className="mt-8 overflow-x-auto">
          <table className="table-admin min-w-[720px]">
            <thead>
              <tr>
                <th>Area</th>
                {(["view", "create", "edit", "delete", "publish", "export"] as const).map(
                  (action) => (
                    <th key={action} className="text-center">
                      {ACTION_LABELS[action]}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((resource) => (
                <tr key={resource}>
                  <td className="whitespace-nowrap font-serif text-base">
                    {RESOURCE_LABELS[resource]}
                  </td>
                  {(["view", "create", "edit", "delete", "publish", "export"] as const).map(
                    (action) => {
                      const applicable =
                        RESOURCE_ACTIONS[resource].includes(action);
                      if (!applicable) {
                        return (
                          <td key={action} className="text-center text-muted/40">
                            —
                          </td>
                        );
                      }

                      const permission =
                        `${resource}:${action}` as Permission;
                      const on = effective.has(permission);
                      const isDefault = roleDefaults.has(permission);
                      const changed = on !== isDefault;
                      // You cannot hand out access you do not have yourself.
                      const disabled =
                        role === "SUPER_ADMIN" ||
                        (!actorGranted.has(permission) && !on);

                      return (
                        <td key={action} className="text-center">
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={disabled}
                            onChange={() => togglePermission(permission)}
                            aria-label={`${RESOURCE_LABELS[resource]} — ${ACTION_LABELS[action]}`}
                            className={`h-4 w-4 accent-charcoal disabled:opacity-30 ${
                              changed ? "ring-2 ring-earth ring-offset-2" : ""
                            }`}
                          />
                        </td>
                      );
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(grants.length > 0 || revokes.length > 0) && (
          <p className="mt-6 text-admin-body text-muted">
            {grants.length} added · {revokes.length} removed, relative to the{" "}
            {ROLE_LABELS[role]} default.
            <button
              type="button"
              onClick={() => {
                setGrants([]);
                setRevokes([]);
              }}
              className="link-underline ml-3 text-charcoal"
            >
              Reset to role default
            </button>
          </p>
        )}
      </section>

      {/* ---- Status & actions ---- */}
      <section className="border-t border-charcoal/10 pt-10">
        <h2 className="font-serif text-h4">Status</h2>

        <label className="mt-8 flex items-start gap-3">
          <input
            type="checkbox"
            checked={isActive}
            disabled={isSelf}
            onChange={(e) => setIsActive(e.target.checked)}
            className="mt-1 h-4 w-4 accent-charcoal disabled:opacity-40"
          />
          <span>
            <span className="block text-admin-body">Active</span>
            <span className="mt-1 block text-[12px] text-muted">
              Deactivating blocks sign-in immediately and ends any live session,
              while keeping the person&apos;s history intact.
              {isSelf && " You cannot deactivate your own account."}
            </span>
          </span>
        </label>

        {isEdit && (
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setResetOpen((open) => !open)}
              className="btn-admin"
            >
              <KeyRound size={14} strokeWidth={1.5} />
              Reset password
            </button>

            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn-admin-danger"
              >
                <Trash2 size={14} strokeWidth={1.5} />
                Delete employee
              </button>
            )}
          </div>
        )}

        {resetOpen && (
          <div className="mt-8 border border-charcoal/15 p-6">
            <p className="label-admin">New password</p>
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <input
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                minLength={10}
                className="field-admin min-w-[18rem] flex-1 font-mono"
                placeholder="At least 10 characters"
              />
              <button
                type="button"
                onClick={() => setResetPassword(randomPassword())}
                className="btn-admin"
              >
                Generate
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting || resetPassword.length < 10}
                className="btn-admin-solid"
              >
                {resetting ? "Resetting" : "Confirm reset"}
              </button>
            </div>
            <p className="mt-4 text-[12px] text-muted">
              They will be required to choose their own password on the next
              sign-in.
            </p>
          </div>
        )}
      </section>

      {/* ---- Save ---- */}
      <div className="sticky bottom-0 flex items-center gap-4 border-t border-charcoal/10 bg-cream py-6">
        <button type="submit" disabled={saving} className="btn-admin-solid">
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving
            </>
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Create employee"
          )}
        </button>

        {saved && (
          <span className="flex items-center gap-2 text-admin-body text-olive">
            <Check size={14} />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
