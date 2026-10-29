import Link from "next/link";
import { brand } from "@/lib/shop";
import { getViewer, homeFor } from "@/lib/auth";

const nav = [
  { href: "/#locations", label: "Locations" },
  { href: "/#staff", label: "Barbers" },
  { href: "/#reviews", label: "Reviews" },
];

// The logo traced from the storefront sign: black on light backgrounds, white on dark.
export function Wordmark({ invert = false, href = "/" }: { invert?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center" aria-label={brand.name}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
      <img
        src={invert ? "/brand/logo-white.svg" : "/brand/logo-black.svg"}
        alt={brand.name}
        width={2863}
        height={610}
        className="h-8 w-auto sm:h-9"
      />
    </Link>
  );
}

export async function SiteHeader() {
  // Signed in: one button back to their app instead of Log in / Sign up.
  const viewer = await getViewer();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-sm font-medium uppercase tracking-wider text-ink transition hover:opacity-60"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {viewer ? (
            <Link
              href={homeFor(viewer.profile.role)}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-2"
            >
              Open my app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper-2"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-2"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
