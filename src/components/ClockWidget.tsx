"use client";

import { useSyncExternalStore } from "react";
import { SHOP_TZ } from "@/lib/format";

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

// Shop-time clock for the widgets page.
export function ClockWidget() {
  const second = useSyncExternalStore(subscribe, getSecond, getServerSecond);
  const now = second === null ? null : new Date(second * 1000);
  const [time, period] = now ? timeFmt.format(now).split(" ") : ["", ""];
  return (
    <div className="rounded-3xl bg-ink p-6 text-paper">
      <p className="text-sm font-semibold text-paper/60">{now ? dateFmt.format(now) : " "}</p>
      <p className="mt-1 font-display text-7xl font-semibold leading-none tracking-tight tabular-nums">
        {time || " "}
        <span className="ml-2 text-2xl font-medium text-paper/70">{period}</span>
      </p>
    </div>
  );
}
