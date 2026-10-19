"use client";

import { useState, useTransition } from "react";
import { addClient, deleteClient, updateClientNotes } from "@/app/actions/staff";
import type { Tables } from "@/lib/database.types";

type Client = Tables<"clients">;

const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" });

function prettyPhone(p: string) {
  const d = p.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function letterOf(name: string) {
  const c = name.trim()[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(c) ? c : "#";
}

// A barber's own client book, A to Z, searchable by name, phone or the cut
// in their notes.
export function ClientList({ clients }: { clients: Client[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const shown = clients
    .filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.notes ?? "").toLowerCase().includes(q) ||
        (digits.length >= 3 && !!c.phone?.includes(digits)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  const groups: [string, Client[]][] = [];
  for (const c of shown) {
    const l = letterOf(c.name);
    if (groups.at(-1)?.[0] !== l) groups.push([l, []]);
    groups.at(-1)![1].push(c);
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        type="search"
        placeholder="Search name or haircut"
        className="w-full rounded-2xl border border-line bg-paper-2 px-4 py-3 text-base outline-none focus:border-ink"
      />

      {clients.length === 0 ? (
        <p className="mt-6 text-sm text-ink-2">
          No clients yet. Tap <strong>+</strong> to add one, or tap <strong>Save to client list</strong> on a walk-in.
        </p>
      ) : shown.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No one matches &ldquo;{query}&rdquo;.</p>
      ) : (
        groups.map(([letter, list]) => (
          <div key={letter} className="mt-5">
            <h3 className="mb-1 px-1 text-xs font-bold text-muted">{letter}</h3>
            <ul className="divide-y divide-line">
              {list.map((c) => {
                const isOpen = open === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : c.id)}
                      className="flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-paper-2 text-sm font-bold">
                        {initials(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{c.name}</span>
                        {c.notes && !isOpen && <span className="block truncate text-sm text-ink-2">{c.notes}</span>}
                      </span>
                      <span aria-hidden className={`text-muted transition ${isOpen ? "rotate-90" : ""}`}>
                        ›
                      </span>
                    </button>

                    {isOpen && (
                      <div className="mb-3 rounded-2xl bg-paper-2 p-4">
                        <p className="text-xs text-muted">
                          {c.phone ? prettyPhone(c.phone) + " · " : ""}
                          {c.visits} {c.visits === 1 ? "visit" : "visits"} · last {dayFmt.format(new Date(c.last_visit_at))}
                        </p>
                        {c.phone && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <a href={`tel:${c.phone}`} className="rounded-full bg-ink py-2 text-center text-xs font-semibold text-paper">
                              Call
                            </a>
                            <a href={`sms:${c.phone}`} className="rounded-full border border-ink bg-paper py-2 text-center text-xs font-semibold">
                              Text
                            </a>
                          </div>
                        )}
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
                            placeholder="Their cut: mid taper, #2 on the sides…"
                            className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-base outline-none focus:border-ink"
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
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}

      {/* Floating add button; hidden while another swipe page is showing. */}
      <button
        type="button"
        aria-label="Add a client"
        onClick={() => setAdding(true)}
        className="fixed bottom-[max(3.75rem,calc(env(safe-area-inset-bottom)+2.75rem))] left-1/2 z-30 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-ink text-3xl leading-none text-paper shadow-lg [[aria-hidden=true]_&]:hidden"
      >
        +
      </button>

      {adding && <AddClientSheet onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddClientSheet({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await addClient(String(f.get("name") ?? ""), String(f.get("phone") ?? ""), String(f.get("notes") ?? ""));
            if (res.error) setError(res.error);
            else onClose();
          });
        }}
        className="mx-auto w-full max-w-md space-y-3 rounded-t-3xl bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">New client</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-muted">
            Cancel
          </button>
        </div>
        <input
          name="name"
          required
          maxLength={60}
          autoFocus
          placeholder="Name"
          className="w-full rounded-2xl border border-line px-4 py-3 text-base outline-none focus:border-ink"
        />
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="Phone (optional)"
          className="w-full rounded-2xl border border-line px-4 py-3 text-base outline-none focus:border-ink"
        />
        <textarea
          name="notes"
          maxLength={500}
          rows={2}
          placeholder="Their cut: mid taper, textured top…"
          className="w-full rounded-2xl border border-line px-4 py-3 text-base outline-none focus:border-ink"
        />
        {error && (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-paper disabled:opacity-60">
          {pending ? "Saving…" : "Save client"}
        </button>
      </form>
    </div>
  );
}
