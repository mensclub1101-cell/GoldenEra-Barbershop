import { StatusPill } from "@/components/AppShell";
import { formatClock, todayInShop } from "@/lib/format";
import type { Tables } from "@/lib/database.types";

type Event = Tables<"events">;

// Upcoming shop events, soonest first, each with a calendar-style date block.
// The owner app passes onDelete to show a Delete button on each one.
export function EventList({
  events,
  shopName,
  onDelete,
  empty,
}: {
  events: Event[];
  shopName: (shopId: string | null) => string;
  onDelete?: (eventId: string) => Promise<void>;
  empty: string;
}) {
  const today = todayInShop();
  if (events.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3">
      {events.map((e) => {
        const [y, m, d] = e.event_date.split("-").map(Number);
        const day = new Date(Date.UTC(y, m - 1, d));
        const part = (opts: Intl.DateTimeFormatOptions) =>
          new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(day);
        const time = e.start_time
          ? `${formatClock(e.start_time)}${e.end_time ? ` – ${formatClock(e.end_time)}` : ""}`
          : "All day";
        return (
          <li key={e.id} className="flex gap-4 rounded-2xl border border-line p-4">
            <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-ink py-2 text-paper">
              <span className="text-[0.65rem] font-semibold uppercase tracking-widest">{part({ month: "short" })}</span>
              <span className="font-display text-2xl font-semibold leading-none">{d}</span>
              <span className="mt-0.5 text-[0.65rem] uppercase tracking-wider text-paper/70">
                {part({ weekday: "short" })}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{e.title}</p>
                {e.event_date === today && <StatusPill tone="ink">Today</StatusPill>}
              </div>
              <p className="mt-0.5 text-sm text-ink-2">
                {time} · {shopName(e.shop_id)}
              </p>
              {e.notes && <p className="mt-1 whitespace-pre-line text-sm text-muted">{e.notes}</p>}
              {onDelete && (
                <form action={onDelete.bind(null, e.id)} className="mt-2">
                  <button className="text-xs font-semibold text-muted underline hover:text-ink">Delete</button>
                </form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
