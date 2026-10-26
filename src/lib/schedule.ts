import { SHOP_TZ } from "@/lib/format";
import { clock } from "@/lib/shop";

// A barber's week: 7 entries, Sunday first, each null (off) or shop-time
// hours in 24h "HH:MM". Stored as-is in barbers.schedule.
export type DayHours = { open: string; close: string } | null;
export type WeekSchedule = DayHours[];

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Trust nothing from the database or a form: anything malformed reads as unset.
export function asSchedule(value: unknown): WeekSchedule | null {
  if (!Array.isArray(value) || value.length !== 7) return null;
  return value.map((d) =>
    d && typeof d === "object" && HHMM.test(d.open) && HHMM.test(d.close) && d.open < d.close
      ? { open: d.open, close: d.close }
      : null,
  );
}

// The card form posts day_<n> (checkbox), open_<n>, close_<n> for n = 0..6.
export function scheduleFromForm(formData: FormData): { schedule?: WeekSchedule; error?: string } {
  const schedule: WeekSchedule = [];
  for (let n = 0; n < 7; n++) {
    if (formData.get(`day_${n}`) !== "on") {
      schedule.push(null);
      continue;
    }
    const open = String(formData.get(`open_${n}`) ?? "");
    const close = String(formData.get(`close_${n}`) ?? "");
    if (!HHMM.test(open) || !HHMM.test(close)) return { error: `Pick start and end times for ${DAY_NAMES[n]}.` };
    if (open >= close) return { error: `${DAY_NAMES[n]}: the end time has to be after the start time.` };
    schedule.push({ open, close });
  }
  return { schedule };
}

// Day of week (0 = Sunday) and "HH:MM" right now in shop time.
function shopNow(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: SHORT.indexOf(get("weekday")), hhmm: `${get("hour")}:${get("minute")}` };
}

export function isWorkingNow(schedule: WeekSchedule | null, at = new Date()) {
  if (!schedule) return false;
  const { day, hhmm } = shopNow(at);
  const today = schedule[day];
  return !!today && hhmm >= today.open && hhmm < today.close;
}

// Short lines for a card: same hours on neighbouring days are grouped,
// e.g. ["Tue–Fri 10am–7pm", "Sat 9am–5pm"].
export function scheduleLines(schedule: WeekSchedule): string[] {
  const lines: string[] = [];
  let n = 0;
  while (n < 7) {
    const d = schedule[n];
    if (!d) {
      n++;
      continue;
    }
    let end = n;
    while (end + 1 < 7 && schedule[end + 1]?.open === d.open && schedule[end + 1]?.close === d.close) end++;
    const days = end === n ? SHORT[n] : `${SHORT[n]}–${SHORT[end]}`;
    lines.push(`${days} ${clock(d.open)}–${clock(d.close)}`);
    n = end + 1;
  }
  return lines;
}

// Arrival times a walk-in can pick today: every 15 minutes from now (or from
// opening, before the shop opens) up to 30 minutes before closing. Empty once
// it's too late. `open` says whether "Now" makes sense.
export function walkinSlots(hours: { days: string[]; open: string; close: string }[], at = new Date()) {
  const { day, hhmm } = shopNow(at);
  const today = hours.find((h) => h.days.includes(DAY_NAMES[day]));
  if (!today) return { open: false, slots: [] as string[] };
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const now = mins(hhmm);
  const last = mins(today.close) - 30;
  const start = Math.max(Math.ceil((now + 1) / 15) * 15, mins(today.open));
  const slots: string[] = [];
  for (let m = start; m <= last; m += 15) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return { open: now >= mins(today.open) && now <= last, slots };
}
