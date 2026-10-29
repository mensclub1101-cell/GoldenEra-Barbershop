"use client";

import { useState, useTransition } from "react";
import { setRentRate } from "@/app/actions/owner";

// "Edit" next to a barber: a pop-up to set how much booth rent they pay.
export function EditRentButton({
  barberId,
  name,
  amountCents,
  className,
}: {
  barberId: string;
  name: string;
  amountCents: number | null;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const save = (amount: string) =>
    startTransition(async () => {
      const res = await setRentRate(barberId, amount);
      if (res.error) setError(res.error);
      else setOpen(false);
    });

  return (
    <>
      <button type="button" onClick={() => (setError(""), setOpen(true))} className={className}>
        Edit
      </button>
      {open && (
        <div className="sheet-backdrop fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <form
            role="dialog"
            aria-label={`Edit ${name}`}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              save(String(new FormData(e.currentTarget).get("amount") ?? ""));
            }}
            className="sheet mx-auto w-full max-w-md space-y-4 rounded-t-3xl bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
          >
            <div aria-hidden className="mx-auto -mt-1 mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">{name}</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-muted">
                Cancel
              </button>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Booth rent ($)</span>
              <input
                name="amount"
                inputMode="decimal"
                autoFocus
                defaultValue={amountCents ? (amountCents / 100).toFixed(2).replace(/\.00$/, "") : ""}
                placeholder="250"
                className="w-full rounded-2xl border border-line px-4 py-3 text-base outline-none focus:border-ink"
              />
              <span className="mt-1.5 block text-xs text-muted">
                Used when you charge rent and leave the amount blank.
              </span>
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-800">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-paper disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            {amountCents !== null && (
              <button
                type="button"
                disabled={pending}
                onClick={() => save("")}
                className="w-full text-xs font-semibold text-muted underline"
              >
                Remove booth rent
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
}
