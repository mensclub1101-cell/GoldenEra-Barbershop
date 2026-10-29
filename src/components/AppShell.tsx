import Link from "next/link";
import { Wordmark } from "@/components/SiteHeader";
import { signOut } from "@/app/actions/auth";
import { homeFor, type Viewer } from "@/lib/auth";

const roleLabel = { owner: "Owner", barber: "Barber", client: "Client" } as const;

// Signed-in chrome for the owner, barber and client areas. `menu` goes to the
// right of Log out (the barber app's ☰ sheet).
export function AppShell({
  viewer,
  menu,
  children,
}: {
  viewer: Viewer;
  menu?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { role } = viewer.profile;
  const links = [
    ...(role === "owner" ? [{ href: "/owner", label: "Shop" }] : []),
    ...(viewer.seat ? [{ href: "/barber", label: "My card" }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark href={homeFor(role)} />
            <span className="hidden rounded-full bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-paper sm:inline">
              {roleLabel[role]}
            </span>
          </div>
          <nav className="flex items-center gap-1">
            {links.length > 1 &&
              links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-paper-2"
                >
                  {l.label}
                </Link>
              ))}
            <form action={signOut}>
              <button className="rounded-full px-3 py-2 text-sm font-semibold text-muted transition hover:bg-paper-2 hover:text-ink">
                Log out
              </button>
            </form>
            {menu}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      <footer className="pb-[calc(env(safe-area-inset-bottom)+5rem)] text-center text-xs text-muted">
        <Link href="/" className="px-2 py-2 underline-offset-2 hover:text-ink hover:underline">
          Website
        </Link>
        ·
        <Link href={role === "owner" ? "/guide?for=owner" : "/guide"} className="px-2 py-2 underline-offset-2 hover:text-ink hover:underline">
          How it works
        </Link>
      </footer>
    </>
  );
}

export function Panel({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function StatusPill({ tone, children }: { tone: "ink" | "muted" | "alert"; children: React.ReactNode }) {
  const tones = {
    ink: "bg-ink text-paper",
    muted: "bg-paper-2 text-muted",
    alert: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}
