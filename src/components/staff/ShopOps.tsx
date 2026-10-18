"use client";

import { useOptimistic, useState, useTransition } from "react";
import { addSupply, removeSupply, setCleaningDone, setSupplyStatus } from "@/app/actions/staff";
import type { SupplyStatus, Tables } from "@/lib/database.types";

const NEXT: Record<SupplyStatus, SupplyStatus> = { full: "low", low: "out", out: "full" };
const STYLE: Record<SupplyStatus, string> = {
  full: "bg-paper-2 text-ink",
  low: "bg-amber-100 text-amber-900",
  out: "bg-red-100 text-red-800",
};

export function SupplyList({ supplies }: { supplies: Tables<"supplies">[] }) {
  const [items, setStatus] = useOptimistic(supplies, (state, { id, status }: { id: string; status: SupplyStatus }) =>
    state.map((s) => (s.id === id ? { ...s, status } : s)),
  );
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);

  const tap = (s: Tables<"supplies">) =>
    startTransition(async () => {
      setStatus({ id: s.id, status: NEXT[s.status] });
      await setSupplyStatus(s.id, NEXT[s.status]);
    });

  const outCount = items.filter((s) => s.status !== "full").length;

  return (
    <div>
      <p className="mb-3 text-sm text-ink-2">
        Tap an item to switch it: Full → Low → Out.{" "}
        {outCount > 0 && <strong>{outCount} need restocking.</strong>}
      </p>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => tap(s)}
              className="flex flex-1 items-center justify-between rounded-2xl border border-line px-4 py-3 text-left active:scale-[0.99]"
            >
              <span className="font-semibold">{s.name}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${STYLE[s.status]}`}>
                {s.status}
              </span>
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => startTransition(() => removeSupply(s.id))}
                className="px-2 text-xs font-semibold text-muted underline"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-2">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = name;
              setName("");
              startTransition(() => addSupply(n));
            }}
            className="flex flex-1 gap-2"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Add an item"
              className="min-w-0 flex-1 rounded-full border border-line px-4 py-2 text-base outline-none focus:border-ink"
            />
            <button type="submit" className="rounded-full bg-ink px-4 text-sm font-semibold text-paper">
              Add
            </button>
          </form>
        ) : null}
        <button type="button" onClick={() => setEditing(!editing)} className="text-xs font-semibold text-muted underline">
          {editing ? "Done editing" : "Edit list"}
        </button>
      </div>
    </div>
  );
}

export function CleaningList({ tasks, weekOf }: { tasks: Tables<"cleaning_tasks">[]; weekOf: string }) {
  const isDone = (t: Tables<"cleaning_tasks">) => !!t.last_done_on && t.last_done_on >= weekOf;
  const [items, setDone] = useOptimistic(tasks, (state, { id, done }: { id: string; done: boolean }) =>
    state.map((t) => (t.id === id ? { ...t, last_done_on: done ? weekOf : null } : t)),
  );
  const [, startTransition] = useTransition();
  const left = items.filter((t) => !isDone(t)).length;

  return (
    <div>
      <p className="mb-3 text-sm text-ink-2">
        Resets every Wednesday. {left === 0 ? <strong>All done this week.</strong> : `${left} left.`}
      </p>
      <ul className="space-y-2">
        {items.map((t) => {
          const done = isDone(t);
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    setDone({ id: t.id, done: !done });
                    await setCleaningDone(t.id, !done);
                  })
                }
                className="flex w-full items-center gap-3 rounded-2xl border border-line px-4 py-3 text-left"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${done ? "border-ink bg-ink text-paper" : "border-line"}`}
                  aria-hidden
                >
                  {done && "✓"}
                </span>
                <span className={done ? "text-muted line-through" : "font-semibold"}>{t.task}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
