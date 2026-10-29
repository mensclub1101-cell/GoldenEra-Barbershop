"use client"; // Error boundaries must be Client Components

import "./globals.css";

// Last resort when the root layout itself fails. Renders its own document.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-paper px-4 text-center text-ink">
        <title>Something went wrong | Golden Era Barbershop</title>
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold uppercase tracking-wide">Something went wrong</h1>
          <p className="mt-4">Check your signal and try again.</p>
          <div className="mt-8 flex flex-col gap-3">
            <button type="button" onClick={() => retry()} className="rounded-full bg-ink px-6 py-3 font-semibold text-paper">
              Try again
            </button>
            <a href="/app" className="rounded-full border border-ink px-6 py-3 font-semibold">
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
