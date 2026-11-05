"use client";

import { useState, useTransition } from "react";
import { confirmFirstCut } from "@/app/actions/staff";
import { telHref } from "@/lib/shop";

type Pending = { profile_id: string; full_name: string | null; phone: string | null; barber_name: string | null };

// Invited clients waiting on their first cut. Tapping "First cut done" after
// their cut pays them 25 points and the friend who invited them 50.
export function FirstCutList({ pending }: { pending: Pending[] }) {
  const [done, setDone] = useState<Record<string, string>>({});
  const [busy, startTransition] = useTransition();

  return (
    <ul className="divide-y divide-line">
      {pending.map((p) => (
        <li key={p.profile_id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{p.full_name ?? "New client"}</p>
            <p className="text-xs text-muted">
              {p.barber_name ? `Picked ${p.barber_name}` : "No barber picked yet"}
              {p.phone && (
                <>
                  {" · "}
                  <a href={telHref(p.phone)} className="underline">
                    {p.phone}
                  </a>
                </>
              )}
            </p>
          </div>
          {done[p.profile_id] ? (
            <span className="text-xs font-semibold text-ink-2">{done[p.profile_id]}</span>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  const r = await confirmFirstCut(p.profile_id);
                  setDone((d) => ({ ...d, [p.profile_id]: r.notice ? "Points sent ✓" : (r.error ?? "Try again") }));
                })
              }
              className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper disabled:opacity-60"
            >
              First cut done
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
