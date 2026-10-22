"use client";

import { useSyncExternalStore } from "react";
import { SHOP_TZ, todayInShop } from "@/lib/format";

const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TZ, hour: "numeric", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TZ, weekday: "long", month: "long", day: "numeric" });

// The current second, as an external store ticking once a second. The server
// snapshot is null so the time never mismatches on hydration.
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
};
const getSecond = () => Math.floor(Date.now() / 1000);
const getServerSecond = () => null;

const NEON = "#39FF14";
const monthFmt = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" });

// The next 30 days from today (shop time), laid out Sunday-first. Built from
// the shop's date key with UTC math so daylight-saving never shifts a day.
function next30(todayKey: string) {
  const [y, m, d] = todayKey.split("-").map(Number);
  return Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(y, m - 1, d + i)));
}

// Compact 30-day calendar for the empty space beside the time. Sundays are
// booth-rent day, marked neon green.
function RentCalendar({ todayKey }: { todayKey: string }) {
  const days = next30(todayKey);
  const lead = days[0].getUTCDay();
  const first = monthFmt.format(days[0]);
  const last = monthFmt.format(days[days.length - 1]);
  return (
    <div
      className="absolute right-5 top-5 flex w-[6.75rem] flex-col justify-between bottom-5"
      aria-label="Next 30 days, rent due Sundays"
    >
      <p className="text-center text-[9px] font-semibold uppercase leading-none tracking-[0.15em] text-paper/60">
        {first === last ? first : `${first} – ${last}`}
      </p>
      <div className="grid grid-cols-7 gap-x-[2px] gap-y-[3px] text-center text-[9px] font-semibold leading-none tabular-nums">
        {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => (
          <span key={i} style={{ color: i === 0 ? NEON : "rgb(255 255 255 / 0.4)" }}>
            {l}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {days.map((day, i) => {
          const sunday = day.getUTCDay() === 0;
          return (
            <span
              key={day.toISOString()}
              aria-label={i === 0 ? "Today" : sunday ? "Rent due" : undefined}
              className={`mx-auto grid h-[13px] w-[13px] place-items-center rounded-full ${
                i === 0 ? "bg-paper text-ink" : sunday ? "text-ink" : "text-paper/80"
              }`}
              style={sunday ? (i === 0 ? { boxShadow: `0 0 0 1.5px ${NEON}` } : { background: NEON }) : undefined}
            >
              {day.getUTCDate()}
            </span>
          );
        })}
      </div>
      <p className="flex items-center justify-center gap-1 text-[9px] font-semibold leading-none text-paper/70">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: NEON }} />
        Rent due
      </p>
    </div>
  );
}

// Shop-time clock for the widgets page, with who's logged in. The calendar is
// pinned in the empty space on the right, so the card keeps its size.
export function ClockWidget({ name }: { name: string }) {
  const second = useSyncExternalStore(subscribe, getSecond, getServerSecond);
  const now = second === null ? null : new Date(second * 1000);
  const [time, period] = now ? timeFmt.format(now).split(" ") : ["", ""];
  return (
    <div className="relative rounded-3xl bg-ink p-6 pr-[8.25rem] text-paper">
      <p className="text-sm font-semibold text-paper/60">{now ? dateFmt.format(now) : " "}</p>
      <p className="mt-1 truncate text-lg font-semibold">{name}</p>
      <p className="mt-3 whitespace-nowrap font-display text-6xl font-semibold leading-none tracking-tight tabular-nums min-[380px]:text-7xl">
        {time || " "}
        <span className="ml-2 text-2xl font-medium text-paper/70">{period}</span>
      </p>
      {now && <RentCalendar todayKey={todayInShop(now)} />}
    </div>
  );
}
