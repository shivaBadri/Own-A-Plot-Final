/** Display helpers. Currency is INR — this is a Hyderabad land business. */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

export function formatPrice(price: number, onRequest = false): string {
  if (onRequest) return "On enquiry";
  return inr.format(price);
}

/** 4500000 -> "45 L", 12500000 -> "1.25 Cr" — how prices are actually spoken here. */
export function formatPriceShort(price: number, onRequest = false): string {
  if (onRequest) return "On enquiry";
  if (price >= 10000000) return `₹${inrCompact.format(price / 10000000)} Cr`;
  if (price >= 100000) return `₹${inrCompact.format(price / 100000)} L`;
  return inr.format(price);
}

export function formatSqft(sqft: number): string {
  return `${new Intl.NumberFormat("en-IN").format(sqft)} sq. ft`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/**
 * Dates are formatted with an explicit locale and timezone on both server and
 * client. Calling `toLocaleDateString()` with no arguments is the single most
 * common cause of Next.js hydration mismatches — the server's locale is not the
 * browser's.
 */
export function formatDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export function formatDateTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
