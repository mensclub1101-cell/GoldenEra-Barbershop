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
            className="w-full shrink-0 snap-start snap-always px-px pb-24"
          >
            {page}
          </section>
        ))}
      </div>

      {/* Page dots, pinned above the bottom edge like the iPhone home screen. */}
      <nav
        aria-label="Pages"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-2 rounded-full bg-ink/80 px-3 py-2 backdrop-blur">
          {labels.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => go(i)}
              aria-label={label}
              aria-current={i === active ? "page" : undefined}
              className={`h-2 rounded-full transition-all ${i === active ? "w-5 bg-paper" : "w-2 bg-paper/40"}`}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
