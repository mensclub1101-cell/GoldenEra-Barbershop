"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { subscribeAsUser } from "@/lib/supabase/browser";
import { closeWalkin, saveWalkinAsClient } from "@/app/actions/staff";
import type { Tables } from "@/lib/database.types";

type Walkin = Tables<"walkins">;

const ALERTS_KEY = "ge-walkin-alerts";

// Alerts preference lives in this browser (localStorage), as an external store.
const listeners = new Set<() => void>();
const alertsStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  get() {
    try {
      return localStorage.getItem(ALERTS_KEY) === "on";
    } catch {
      return false;
    }
  },
  set(on: boolean) {
    try {
      localStorage.setItem(ALERTS_KEY, on ? "on" : "off");
    } catch {}
    listeners.forEach((cb) => cb());
  },
};

// A short two-note chime, made on the fly so there's no audio file to load.
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.32);
    });
  } catch {}
}

function waited(since: string, now: number) {
  const mins = Math.max(0, Math.round((now - new Date(since).getTime()) / 60000));
  return mins < 1 ? "just now" : `${mins} min`;
}

// Live walk-in queue for the barber's shop.
export function WalkinsWidget({
  shopId,
  seatId,
  initial,
  barberNames,
}: {
  shopId: string;
  seatId: string;
  initial: Walkin[];
  barberNames: Record<string, string>;
}) {
  const [queue, setQueue] = useState(initial);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const alerts = useSyncExternalStore(alertsStore.subscribe, alertsStore.get, () => false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return subscribeAsUser(`walkins:${shopId}`, (channel) =>
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "walkins", filter: `shop_id=eq.${shopId}` },
        (change) => {
          const row = change.new as Walkin;
          if (change.eventType === "INSERT" && row.status === "waiting") {
            setQueue((q) => (q.some((w) => w.id === row.id) ? q : [...q, row]));
            if (alertsStore.get()) {
              chime();
              navigator.vibrate?.([200, 100, 200]);
              if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
                new Notification("New walk-in", { body: `${row.name} just checked in` });
              }
            }
          } else if (change.eventType === "UPDATE" && row.status !== "waiting") {
            setQueue((q) => q.filter((w) => w.id !== row.id));
          }
        },
      ),
    );
  }, [shopId]);

  const toggleAlerts = async () => {
    if (!alerts && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => {});
    }
    if (!alerts) chime(); // also unlocks audio on iPhone, which needs a tap first
    alertsStore.set(!alerts);
  };

  const close = (id: string, outcome: "done" | "no_show") => {
    setQueue((q) => q.filter((w) => w.id !== id));
    startTransition(() => closeWalkin(id, outcome));
  };

  const save = (w: Walkin) =>
    startTransition(async () => {
      const res = await saveWalkinAsClient(w.id);
      setSaved((s) => ({ ...s, [w.id]: res.notice ?? res.error ?? "" }));
    });

  return (
    <div>
      <button
        type="button"
        onClick={toggleAlerts}
        aria-pressed={alerts}
        className={`mb-4 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition ${
          alerts ? "bg-ink text-paper" : "border border-line text-ink hover:border-ink"
        }`}
      >
        {alerts ? "Alerts on · tap to turn off" : "Allow walk-in alerts"}
      </button>

      {queue.length === 0 ? (
        <p className="text-sm text-muted">No one waiting right now.</p>
      ) : (
        <ol className="space-y-3">
          {queue.map((w, i) => {
            const forWho = w.barber_id ? (w.barber_id === seatId ? "For you" : `For ${barberNames[w.barber_id] ?? "a barber"}`) : "First available";
            return (
              <li key={w.id} className="rounded-2xl bg-paper-2 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    {i + 1}. {w.name}
                  </p>
                  <span className="text-xs text-muted">{waited(w.created_at, now)}</span>
                </div>
                <p className={`text-xs ${w.barber_id === seatId ? "font-semibold text-ink" : "text-muted"}`}>{forWho}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <a href={`tel:${w.phone}`} className="rounded-full bg-ink py-2 text-center text-xs font-semibold text-paper">
                    Call
                  </a>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => close(w.id, "done")}
                    className="rounded-full border border-ink py-2 text-xs font-semibold"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => close(w.id, "no_show")}
                    className="rounded-full border border-line py-2 text-xs font-semibold text-muted"
                  >
                    No-show
                  </button>
                </div>
                <button
                  type="button"
                  disabled={pending || !!saved[w.id]}
                  onClick={() => save(w)}
                  className="mt-2 w-full rounded-full py-1.5 text-xs font-semibold text-ink underline disabled:no-underline disabled:opacity-70"
                >
                  {saved[w.id] || "Save to client list"}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
