import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { signUp } from "@/app/actions/auth";
import { getViewer, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign up | Golden Era Barbershop" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { ref } = await searchParams;
  const invite = typeof ref === "string" && /^[A-Za-z0-9]{4,12}$/.test(ref) ? ref.toUpperCase() : null;
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.profile.role));

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-line p-6 sm:p-8">
          <h1 className="font-display text-4xl font-semibold uppercase tracking-wide">Sign up</h1>
          <p className="mt-2 text-sm text-muted">
            {invite
              ? "A friend invited you. Sign up and check in for your first cut from the app, and you both get points."
              : "Save your barber and book in one tap next time."}
          </p>
          <ActionForm action={signUp} className="mt-6 space-y-4">
            {invite && <input type="hidden" name="ref" value={invite} />}
            <Field label="Your name" name="full_name" autoComplete="name" required />
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" placeholder="(951) 555-0123" />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              hint="At least 8 characters."
              required
            />
            <SubmitButton className="w-full">Create account</SubmitButton>
          </ActionForm>
          <p className="mt-6 text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-ink underline">
              Log in
            </Link>
          </p>
          <p className="mt-2 text-sm text-muted">Barbers: use the invite link the owner sent you.</p>
        </div>
      </main>
    </>
  );
}
