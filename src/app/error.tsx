"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

// Any page that breaks lands here with two ways out: try again, or go home.
// No SiteHeader (it reads the session on the server); plain links instead.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24 pt-[calc(env(safe-area-inset-top)+6rem)]">
      <div className="w-full max-w-md rounded-3xl border border-line p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Hiccup</p>
        <h1 className="mt-3 font-display text-4xl font-semibold uppercase tracking-wide">Something went wrong</h1>
        <p className="mt-4 text-ink-2">Check your signal and try again. If it keeps happening, head home and start over.</p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold uppercase tracking-wider text-paper"
          >
            Try again
          </button>
          {/* Plain <a>: a full reload clears whatever state broke. /app sends signed-in people to their app. */}
          <a href="/app" className="rounded-full border border-ink px-6 py-3 text-sm font-semibold uppercase tracking-wider">
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
