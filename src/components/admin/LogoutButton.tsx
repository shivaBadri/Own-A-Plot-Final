"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Refresh as well as push: the server components in the admin layout must
      // re-run, or a cached shell can survive the logout.
      router.push("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-cream/55 transition-colors duration-500 hover:text-cream disabled:opacity-40"
    >
      <LogOut size={13} strokeWidth={1.4} />
      {loading ? "Signing out" : "Sign out"}
    </button>
  );
}
