import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { acceptInvite, signUpWithInvite } from "@/app/actions/auth";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Join | Golden Era Barbershop", robots: { index: false } };

function Card({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border border-line p-6 sm:p-8">{children}</div>
      </main>
    </>
  );
}

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("peek_invite", { p_token: token });
  const invite = data?.[0];

  if (!invite || !invite.valid) {
    return (
      <Card>
        <h1 className="font-display text-3xl font-semibold uppercase tracking-wide">Link not valid</h1>
        <p className="mt-3 text-ink-2">
          This invite link was already used or has expired. Ask the shop owner to send you a new one.
        </p>
        <Link href="/login" className="mt-6 inline-block font-semibold underline">
          Already joined? Log in
        </Link>
      </Card>
    );
  }

  const who =
    invite.role === "owner"
      ? "the owner of Golden Era Barbershop"
      : `${invite.display_name} at Golden Era ${invite.shop_name}`;
  const viewer = await getViewer();

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">You&rsquo;re invited</p>
      <h1 className="mt-2 font-display text-3xl font-semibold uppercase tracking-wide">Join as {who}</h1>
      <p className="mt-2 text-sm text-muted">
        New to the app?{" "}
        <Link href={invite.role === "owner" ? "/guide?for=owner" : "/guide"} className="font-semibold text-ink underline">
          See how it works
        </Link>
      </p>

      {viewer ? (
        <ActionForm action={acceptInvite.bind(null, token)} className="mt-6 space-y-4">
          <p className="text-sm text-ink-2">
            You&rsquo;re logged in as <strong>{viewer.email ?? viewer.profile.full_name}</strong>.
          </p>
          <SubmitButton className="w-full">Accept invite</SubmitButton>
        </ActionForm>
      ) : (
        <>
          <ActionForm action={signUpWithInvite.bind(null, token)} className="mt-6 space-y-4">
            <Field
              label="Your name"
              name="full_name"
              autoComplete="name"
              defaultValue={invite.display_name}
              required
            />
            <Field label="Email" name="email" type="email" autoComplete="email" required />
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
            <Link href={`/login?next=/join/${token}`} className="font-semibold text-ink underline">
              Log in
            </Link>
          </p>
        </>
      )}
    </Card>
  );
}
