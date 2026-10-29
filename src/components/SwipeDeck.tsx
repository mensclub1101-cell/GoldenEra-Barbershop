"use client";

import { Children, useEffect, useRef, useState } from "react";

// iPhone home-screen style pages: swipe sideways between full-width pages,
// with dots at the bottom. Opens on `start` (like the home screen), so pages
// before it are reached by swiping right, the way Today View works.
export function SwipeDeck({
  labels,
  start = 0,
  children,
}: {
  labels: string[];
  start?: number;
  children: React.ReactNode;
}) {
  const pages = Children.toArray(children);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(start);

  // Jump to the home page before the first paint of the deck, without animating.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = start * el.clientWidth;
  }, [start]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setActive(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (i: number) => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: "smooth" });

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex snap-x snap-mandatory items-start overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((page, i) => (
          <section
            key={i}
            aria-label={labels[i]}
            aria-hidden={i !== active}
            className="w-full shrink-0 snap-start snap-always px-px pb-28"
          >
            {page}
          </section>
        ))}
      </div>

      {/* Tab bar pinned to the bottom like a native app: icon + label per page. */}
      {pages.length > 1 && (
        <nav
          aria-label="Pages"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-paper/85 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
        >
          <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pt-1.5 pb-1">
            {labels.map((label, i) => {
              const current = i === active;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={label}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 transition-colors ${
                    current ? "text-ink" : "text-muted"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${current ? "bg-ink text-paper" : ""}`}
                  >
                    <TabIcon name={label} />
                  </span>
                  <span className={`w-full truncate text-center text-[10px] leading-tight ${current ? "font-semibold" : "font-medium"}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

// Simple line icons for the tab bar, keyed by page label. Unknown labels get a dot.
const ICONS: Record<string, React.ReactNode> = {
  Widgets: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  Media: (
    <>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  "Shop ops": (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 9.5l1.5 1.5L13 8.5M9 15.5h6" />
    </>
  ),
  Booking: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M8.5 3v4M15.5 3v4" />
    </>
  ),
  Clients: (
    <>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M3.5 19.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
      <path d="M15.5 5.8a3.5 3.5 0 0 1 0 6.4M17.5 15.3c1.4.6 2.5 2 3 4.2" />
    </>
  ),
  Events: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M8.5 3v4M15.5 3v4" />
      <path d="M12 12.3l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" />
    </>
  ),
  "Booth rent": (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9.5v5M17 9.5v5" />
    </>
  ),
  Supplies: (
    <>
      <path d="M4 8l8-4 8 4v8l-8 4-8-4z" />
      <path d="M4 8l8 4 8-4M12 12v8" />
    </>
  ),
  Reviews: <path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />,
  Shop: (
    <>
      <path d="M4 9.5L5.5 5h13L20 9.5a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3 0z" />
      <path d="M5.5 12v7.5h13V12M10 19.5v-4h4v4" />
    </>
  ),
};

function TabIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name] ?? <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}
