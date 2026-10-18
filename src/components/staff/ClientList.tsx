"use client";

import { useState, useTransition } from "react";
import { deleteClient, updateClientNotes } from "@/app/actions/staff";
import type { Tables } from "@/lib/database.types";

const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" });

function prettyPhone(p: string) {
  const d = p.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p;
}

// A barber's own client book: walk-ins they saved.
export function ClientList({ clients }: { clients: Tables<"clients">[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const q = query.trim().toLowerCase();
  const shown = q
    ? clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q.replace(/\D/g, "") || "~"))
    : clients;

  if (clients.length === 0) {
    return (
      <p className="text-sm text-ink-2">
        No clients yet. When you help a walk-in, tap <strong>Save to client list</strong> and they&rsquo;ll show up
        here.
      </p>
    );
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name or phone"
        className="mb-3 w-full rounded-full border border-line px-4 py-2.5 text-base outline-none focus:border-ink"
      />
      <ul className="space-y-2">
        {shown.map((c) => (
          <li key={c.id} className="rounded-2xl border border-line p-4">
            <button type="button" onClick={() => setOpen(open === c.id ? null : c.id)} className="w-full text-left">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">{c.name}</p>
                <span className="text-xs text-muted">
                  {c.visits} {c.visits === 1 ? "visit" : "visits"} · {dayFmt.format(new Date(c.last_visit_at))}
                </span>
              </div>
              <p className="text-xs text-muted">{prettyPhone(c.phone)}</p>
              {c.notes && open !== c.id && <p className="mt-1 line-clamp-1 text-xs text-ink-2">{c.notes}</p>}
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:${c.phone}`} className="rounded-full bg-ink py-2 text-center text-xs font-semibold text-paper">
                Call
              </a>
              <a href={`sms:${c.phone}`} className="rounded-full border border-ink py-2 text-center text-xs font-semibold">
                Text
              </a>
            </div>
            {open === c.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const notes = String(new FormData(e.currentTarget).get("notes") ?? "");
                  startTransition(() => updateClientNotes(c.id, notes));
                }}
                className="mt-3 space-y-2"
              >
                <textarea
                  name="notes"
                  defaultValue={c.notes ?? ""}
                  maxLength={500}
                  rows={3}
                  placeholder="Notes: #2 guard on sides, no line-up…"
                  className="w-full rounded-2xl border border-line px-4 py-3 text-base outline-none focus:border-ink"
                />
                <div className="flex items-center justify-between">
                  <button type="submit" disabled={pending} className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper">
                    Save notes
                  </button>
                  <button
                    type="button"
                    onClick={() => confirm(`Remove ${c.name} from your clients?`) && startTransition(() => deleteClient(c.id))}
                    className="text-xs font-semibold text-muted underline"
                  >
                    Remove
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
