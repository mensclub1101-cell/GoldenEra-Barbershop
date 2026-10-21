// Shop-local dates. Never build a date key with toISOString(): it converts to
// UTC and rolls the date over in the evening.
export const SHOP_TZ = "America/Los_Angeles";

export function todayInShop(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

// "2026-11-01" -> "Nov 1, 2026" (a calendar date, so format it in UTC).
export function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function formatTimestamp(ts: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TZ, month: "short", day: "numeric" }).format(new Date(ts));
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// "250" or "250.50" -> 25050. Returns null for anything that isn't a positive amount.
export function parseDollars(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents > 0 ? cents : null;
}

export type RentStatus = "paid" | "late" | "due";

export function rentStatus(charge: { due_date: string; paid_at: string | null }, today = todayInShop()): RentStatus {
  if (charge.paid_at) return "paid";
  return charge.due_date < today ? "late" : "due";
}

// The most recent Wednesday on or before `today` (YYYY-MM-DD, shop time): the
// cleaning list's week starts then.
export function thisWednesday(today = todayInShop()): string {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d - ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() - 3 + 7) % 7)));
  // Built from calendar parts in UTC, so formatting it in UTC can't roll the day.
  return date.toISOString().slice(0, 10);
}
