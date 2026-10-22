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

function MonthStrip({ todayKey }: { todayKey: string }) {
  const days = next30(todayKey);
  const lead = days[0].getUTCDay();
  const first = monthFmt.format(days[0]);
  const last = monthFmt.format(days[days.length - 1]);
  return (
    <div className="mt-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-paper/60">
        Next 30 days · {first === last ? first : `${first} – ${last}`}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs tabular-nums">
        {["S", "M", "T", "W", "T", "F", "S"].map((l, i) => (
          <span
            key={i}
            className="pb-1 font-semibold"
            style={i === 0 ? { color: NEON } : { color: "rgb(255 255 255 / 0.4)" }}
          >
            {l}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {days.map((day, i) => {
          const sunday = day.getUTCDay() === 0;
          const date = day.getUTCDate();
          return (
            <span
              key={day.toISOString()}
              aria-label={i === 0 ? "Today" : undefined}
              className={`grid h-7 place-items-center rounded-full font-semibold ${
                i === 0 ? "bg-paper text-ink" : sunday ? "" : "text-paper/80"
              }`}
              style={
                sunday ? { boxShadow: `inset 0 0 0 1.5px ${NEON}`, ...(i === 0 ? {} : { color: NEON }) } : undefined
              }
            >
              {date === 1 ? monthFmt.format(day) : date}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Shop-time clock for the widgets page, with who's logged in.
export function ClockWidget({ name }: { name: string }) {
  const second = useSyncExternalStore(subscribe, getSecond, getServerSecond);
  const now = second === null ? null : new Date(second * 1000);
  const [time, period] = now ? timeFmt.format(now).split(" ") : ["", ""];
  return (
    <div className="rounded-3xl bg-ink p-6 text-paper">
      <p className="text-sm font-semibold text-paper/60">{now ? dateFmt.format(now) : " "}</p>
      <p className="mt-1 text-lg font-semibold">{name}</p>
      <p className="mt-3 font-display text-7xl font-semibold leading-none tracking-tight tabular-nums">
        {time || " "}
        <span className="ml-2 text-2xl font-medium text-paper/70">{period}</span>
      </p>
      {now && <MonthStrip todayKey={todayInShop(now)} />}
    </div>
  );
}
