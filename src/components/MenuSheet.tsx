"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

// ☰ button in the app header that opens a pop-up sheet. A dot on the button
// flags something waiting inside (like an unfinished card). The sheet is
// portaled to <body>: the header's backdrop blur would otherwise trap a
// fixed-position overlay inside the header bar.
export function MenuSheet({ title, dot, children }: { title: string; dot?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={dot ? "Menu (needs attention)" : "Menu"}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-paper-2"
      >
        <span aria-hidden className="flex w-5 flex-col gap-[5px]">
          <span className="h-0.5 rounded-full bg-ink" />
          <span className="h-0.5 rounded-full bg-ink" />
          <span className="h-0.5 rounded-full bg-ink" />
        </span>
        {dot && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-paper"
          />
        )}
      </button>
      {open &&
        createPortal(
          <div className="sheet-backdrop fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-label={title}
              onClick={(e) => e.stopPropagation()}
              className="sheet mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
            >
              <div aria-hidden className="mx-auto -mt-1 mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">{title}</h2>
                <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-muted">
                  Close
                </button>
              </div>
              {children}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
