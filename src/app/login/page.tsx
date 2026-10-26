import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { signIn } from "@/app/actions/auth";
import { getViewer, homeFor, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in | Golden Era Barbershop" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext((await searchParams).next);
  const viewer = await getViewer();
  if (viewer) redirect(next ?? homeFor(viewer.profile.role));

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-line p-6 sm:p-8">
          <h1 className="font-display text-4xl font-semibold uppercase tracking-wide">Log in</h1>
          <p className="mt-2 text-sm text-muted">Clients, barbers and the shop owner all log in here.</p>
          <ActionForm action={signIn} className="mt-6 space-y-4">
            {next && <input type="hidden" name="next" value={next} />}
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <Field label="Password" name="password" type="password" autoComplete="current-password" required />
            <SubmitButton className="w-full">Log in</SubmitButton>
          </ActionForm>
          <p className="mt-6 text-sm text-muted">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-ink underline">
              Create an account
            </Link>
          </p>
          <p className="mt-2 text-sm text-muted">
            New barber? Use the invite link the owner sent you.{" "}
            <Link href="/guide" className="font-semibold text-ink underline">
              How the app works
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
