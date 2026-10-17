"use client";

import { useEffect, useState } from "react";
import { telHref, type Barber, type Location } from "@/lib/shop";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StaffGrid({ barbers, locations }: { barbers: Barber[]; locations: Location[] }) {
  const tabs = [...locations.map((l) => ({ slug: l.slug, name: l.name })), { slug: "all", name: "All" }];
  const locationName = (slug: string) => locations.find((l) => l.slug === slug)?.name ?? slug;
  const [active, setActive] = useState("all");

  // "See barbers" on a location card links to #barbers-<slug>: pick that tab and scroll here.
  useEffect(() => {
    function fromHash() {
      const slug = window.location.hash.match(/^#barbers-(.+)$/)?.[1];
      if (!slug || !tabs.some((t) => t.slug === slug)) return;
      setActive(slug);
      document.getElementById("staff")?.scrollIntoView({ behavior: "smooth" });
    }
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // Tabs only change when the roster does; the hash check reads them fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = active === "all" ? barbers : barbers.filter((b) => b.location === active);

  return (
    <div>
      <div role="tablist" aria-label="Filter barbers by location" className="mb-8 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.slug}
            role="tab"
            aria-selected={active === t.slug}
            onClick={() => setActive(t.slug)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              active === t.slug
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper text-ink hover:border-ink"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((b) => (
          <li
            key={b.name}
            className="group flex flex-col rounded-2xl border border-line bg-paper p-6 transition hover:border-ink"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg font-semibold tracking-wider text-paper">
                {initials(b.name)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-medium uppercase tracking-wide">{b.name}</p>
                <p className="text-sm text-muted">{locationName(b.location)}</p>
              </div>
              {b.sample && (
                <span className="ml-auto rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Sample
                </span>
              )}
            </div>
            {b.specialty && <p className="mt-4 text-sm text-ink-2">{b.specialty}</p>}
            <div className="mt-auto flex gap-2 pt-6">
              {b.bookingUrl ? (
                <a
                  href={b.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-full bg-ink px-4 py-2 text-center text-sm font-semibold text-paper transition hover:bg-ink-2"
                >
                  Book with {b.name.split(" ")[0]}
                </a>
              ) : (
                <button
                  disabled
                  className="flex-1 rounded-full border border-ink px-4 py-2 text-sm font-semibold text-ink opacity-60"
                >
                  Booking opens soon
                </button>
              )}
              {b.instagram && (
                <a
                  href={`https://instagram.com/${b.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${b.name} on Instagram`}
                  className="rounded-full border border-ink px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink hover:text-paper"
                >
                  IG
                </a>
              )}
              {b.phone && (
                <a
                  href={telHref(b.phone)}
                  aria-label={`Call ${b.name} at ${b.phone}`}
                  className="rounded-full border border-ink px-4 py-2 text-sm font-semibold text-ink transition hover:bg-ink hover:text-paper"
                >
                  Call
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
