"use client";

import { useState } from "react";

// Pill buttons at the top to flip between shops. Every shop's view stays
// rendered (just hidden), so a half-filled form survives a switch.
export function ShopTabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [current, setCurrent] = useState(tabs[0]?.id);
  return (
    <div>
      <div role="tablist" aria-label="Shop" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === current}
            onClick={() => setCurrent(t.id)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              t.id === current ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" hidden={t.id !== current}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
