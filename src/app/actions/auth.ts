"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor, safeNext } from "@/lib/auth";

export type FormState = { error?: string; notice?: string } | undefined;

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email");
  const password = text(formData, "password");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match." };

  redirect(safeNext(formData.get("next")) ?? "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

async function claim(token: string): Promise<FormState> {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc("claim_invite", { p_token: token });
  if (error || !role) return { error: error?.message ?? "Couldn't use this invite." };
  redirect(homeFor(role));
}

// Signed-in user accepts an invite. useActionState passes the previous state,
// which this action doesn't need.
export async function acceptInvite(token: string): Promise<FormState> {
  return claim(token);
}

// New user creates an account from an invite link, then claims it.
export async function signUpWithInvite(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = text(formData, "full_name");
  const email = text(formData, "email");
  const password = text(formData, "password");
  if (!fullName || !email) return { error: "Enter your name and email." };
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };
  if (!data.session) {
    return { notice: "Check your email to confirm your account, then open this invite link again and log in." };
  }
  return claim(token);
}

// Public sign-up. Every new account is a client; staff roles only come from
// invites.
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = text(formData, "full_name");
  const email = text(formData, "email");
  const phone = text(formData, "phone");
  const password = text(formData, "password");
  if (!fullName || !email) return { error: "Enter your name and email." };
  if (password.length < 8) return { error: "Use a password with at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  });
  if (error) {
    // Supabase signals this with a code on some paths and only a message on others.
    if (error.code === "user_already_exists" || /already (registered|exists)/i.test(error.message)) {
      return { error: "That email already has an account. Log in instead." };
    }
    return { error: error.message };
  }
  // Supabase hides existing emails by returning a user with no identities.
  if (data.user?.identities?.length === 0) return { error: "That email already has an account. Log in instead." };
  if (!data.session) return { notice: "Check your email to confirm your account, then log in." };
  redirect("/client");
}

// Walk-in check-in from the website or the QR code at the door. Anyone can do
// this; check_in() validates and rate-limits in the database.
export async function checkIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const barber = text(formData, "barber_id");
  const eta = text(formData, "eta");
  const { data: place, error } = await supabase.rpc("walkin_check_in", {
    p_shop: text(formData, "shop"),
    p_name: text(formData, "name"),
    p_phone: text(formData, "phone"),
    ...(barber ? { p_barber: barber } : {}),
    ...(eta ? { p_eta: eta } : {}),
  });
  if (error) return { error: error.message };
  return {
    notice:
      place === 1
        ? "You're checked in and next in line. A barber will call you shortly."
        : `You're checked in. You're #${place} in line. A barber will call you when it's your turn.`,
  };
}
