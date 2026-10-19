"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  addCleaningTask,
  addSupply,
  removeCleaningTask,
  removeSupply,
  setCleaningAssignee,
  setCleaningDone,
  setSupplyStatus,
} from "@/app/actions/staff";
import type { SupplyStatus, Tables } from "@/lib/database.types";

type Supply = Tables<"supplies">;
type Task = Tables<"cleaning_tasks">;

const STATUSES: SupplyStatus[] = ["full", "low", "out"];
const LABEL: Record<SupplyStatus, string> = { full: "Full", low: "Low", out: "Out" };
const DOT: Record<SupplyStatus, string> = { full: "bg-emerald-500", low: "bg-amber-400", out: "bg-red-500" };
const RANK: Record<SupplyStatus, number> = { out: 0, low: 1, full: 2 };

function AddForm({ placeholder, maxLength, onAdd }: { placeholder: string; maxLength: number; onAdd: (v: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onAdd(value);
        setValue("");
      }}
      className="mt-3 flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-full border border-line px-4 py-2 text-base outline-none focus:border-ink"
      />
      <button type="submit" className="rounded-full bg-ink px-4 text-sm font-semibold text-paper">
        Add
      </button>
    </form>
  );
}

function EditToggle({ editing, onClick }: { editing: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 text-xs font-semibold text-muted underline">
      {editing ? "Done editing" : "Edit list"}
    </button>
  );
}

export function SupplyList({ supplies }: { supplies: Supply[] }) {
  const [items, setStatus] = useOptimistic(supplies, (state, { id, status }: { id: string; status: SupplyStatus }) =>
    state.map((s) => (s.id === id ? { ...s, status } : s)),
  );
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  // Restock items float to the top, but only as of page load, so a row
  // doesn't jump out from under your thumb while you're tapping.
  const [order] = useState(() =>
    [...supplies].sort((a, b) => RANK[a.status] - RANK[b.status]).map((s) => s.id),
  );
  const pos = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
  const sorted = [...items].sort((a, b) => pos(a.id) - pos(b.id));

  const set = (s: Supply, status: SupplyStatus) => {
    if (s.status === status) return;
    startTransition(async () => {
      setStatus({ id: s.id, status });
      await setSupplyStatus(s.id, status);
    });
  };

  const out = items.filter((s) => s.status === "out").length;
  const low = items.filter((s) => s.status === "low").length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
        {out + low === 0 ? (
          <span className="rounded-full bg-paper-2 px-3 py-1">All stocked</span>
        ) : (
          <>
            {out > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1">
                <span className={`h-2 w-2 rounded-full ${DOT.out}`} /> {out} out
              </span>
            )}
            {low > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1">
                <span className={`h-2 w-2 rounded-full ${DOT.low}`} /> {low} low
              </span>
            )}
          </>
        )}
      </div>

      <ul className="divide-y divide-line">
        {sorted.map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[s.status]}`} aria-hidden />
            <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
            {editing ? (
              <button
                type="button"
                onClick={() => startTransition(() => removeSupply(s.id))}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted"
              >
                Remove
              </button>
            ) : (
              <div role="radiogroup" aria-label={s.name} className="flex shrink-0 rounded-full bg-paper-2 p-0.5">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    role="radio"
                    aria-checked={s.status === st}
                    onClick={() => set(s, st)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      s.status === st ? "bg-ink text-paper" : "text-muted"
                    }`}
                  >
                    {LABEL[st]}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {editing && <AddForm placeholder="Add an item" maxLength={40} onAdd={(n) => startTransition(() => addSupply(n))} />}
      <EditToggle editing={editing} onClick={() => setEditing(!editing)} />
    </div>
  );
}

export function CleaningList({ tasks, weekOf }: { tasks: Task[]; weekOf: string }) {
  const isDone = (t: Task) => !!t.last_done_on && t.last_done_on >= weekOf;
  const [items, setDone] = useOptimistic(tasks, (state, { id, done }: { id: string; done: boolean }) =>
    state.map((t) => (t.id === id ? { ...t, last_done_on: done ? weekOf : null } : t)),
  );
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const doneCount = items.filter(isDone).length;
  const total = items.length;

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-3xl font-bold tabular-nums">
            {doneCount}/{total}
          </p>
          <p className="text-xs text-muted">
            {total > 0 && doneCount === total ? "All done this week" : "Resets every Wednesday"}
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2">
          <div
            className="h-full rounded-full bg-ink transition-all"
            style={{ width: total ? `${(doneCount / total) * 100}%` : 0 }}
          />
        </div>
      </div>

      <ul className="divide-y divide-line">
        {items.map((t) => {
          const done = isDone(t);
          return (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={t.task}
                onClick={() =>
                  startTransition(async () => {
                    setDone({ id: t.id, done: !done });
                    await setCleaningDone(t.id, !done);
                  })
                }
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 text-sm ${
                    done ? "border-ink bg-ink text-paper" : "border-line"
                  }`}
                  aria-hidden
                >
                  {done && "✓"}
                </span>
                <span className={done ? "text-muted line-through" : "font-semibold"}>{t.task}</span>
              </button>
              {editing ? (
                <>
                  <input
                    defaultValue={t.assignee ?? ""}
                    maxLength={40}
                    placeholder="Who?"
                    aria-label={`Who's on ${t.task}`}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== (t.assignee ?? "")) {
                        const v = e.target.value;
                        startTransition(() => setCleaningAssignee(t.id, v));
                      }
                    }}
                    className="w-24 shrink-0 rounded-full border border-line px-3 py-1 text-base outline-none focus:border-ink sm:text-xs"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${t.task}`}
                    onClick={() => startTransition(() => removeCleaningTask(t.id))}
                    className="shrink-0 px-1 text-lg leading-none text-muted"
                  >
                    ×
                  </button>
                </>
              ) : (
                t.assignee && (
                  <span className="max-w-[40%] shrink-0 truncate rounded-full bg-paper-2 px-3 py-1 text-xs font-semibold">
                    {t.assignee}
                  </span>
                )
              )}
            </li>
          );
        })}
      </ul>

      {editing && (
        <AddForm placeholder="Add a task" maxLength={80} onAdd={(n) => startTransition(() => addCleaningTask(n))} />
      )}
      <EditToggle editing={editing} onClick={() => setEditing(!editing)} />
    </div>
  );
}
