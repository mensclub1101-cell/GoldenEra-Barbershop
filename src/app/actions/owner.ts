"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { parseDollars } from "@/lib/format";
import type { FormState } from "./auth";

// Every action re-checks the role; RLS enforces it again in the database.

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function urlOrNull(value: string) {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function done() {
  revalidatePath("/owner");
  revalidatePath("/");
}

export async function addBarber(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("owner");
  const displayName = text(formData, "display_name");
  const shopId = text(formData, "shop_id");
  if (!displayName || !shopId) return { error: "Enter a name and pick a shop." };

  const supabase = await createClient();
  const { error } = await supabase.from("barbers").insert({
    display_name: displayName,
    shop_id: shopId,
    phone: text(formData, "phone") || null,
    booking_url: urlOrNull(text(formData, "booking_url")),
  });
  if (error) return { error: error.message };
  done();
  return { notice: `${displayName} added. Send them an invite link so they can manage their card.` };
}

export async function createInvite(barberId: string) {
  const viewer = await requireRole("owner");
  const supabase = await createClient();
  // One live link per seat: drop any unused ones first.
  await supabase.from("invites").delete().eq("barber_id", barberId).is("used_at", null);
  await supabase.from("invites").insert({ role: "barber", barber_id: barberId, created_by: viewer.userId });
  done();
}

// The shop's booking-system sign-in page, shown as a tab on every barber's
// Booking page. Blank clears it.
export async function setShopLogin(shopId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("owner");
  const raw = text(formData, "staff_login_url");
  const url = urlOrNull(raw);
  if (url && !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(url)) return { error: "That doesn't look like a web address." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .update({ staff_login_url: url?.replace(/^http:\/\//i, "https://") ?? null })
    .eq("id", shopId);
  if (error) return { error: "Couldn't save. Try again." };
  revalidatePath("/owner");
  revalidatePath("/barber");
  return { notice: url ? "Saved. Barbers see it on their Booking page." : "Removed." };
}

export async function setBarberActive(barberId: string, active: boolean) {
  await requireRole("owner");
  const supabase = await createClient();
  await supabase.from("barbers").update({ active }).eq("id", barberId);
  done();
}

// Set (or clear, with a blank amount) a barber's booth rent.
export async function setRentRate(barberId: string, amount: string): Promise<{ error?: string }> {
  await requireRole("owner");
  const supabase = await createClient();
  if (!amount.trim()) {
    await supabase.from("rent_rates").delete().eq("barber_id", barberId);
  } else {
    const cents = parseDollars(amount);
    if (cents === null || cents <= 0) return { error: "Enter an amount like 250 or 250.00." };
    const { error } = await supabase
      .from("rent_rates")
      .upsert({ barber_id: barberId, amount_cents: cents, updated_at: new Date().toISOString() });
    if (error) return { error: "Couldn't save. Try again." };
  }
  done();
  return {};
}

export async function addRentCharge(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("owner");
  const barberId = text(formData, "barber_id");
  const dueDate = text(formData, "due_date");
  const amountText = text(formData, "amount");
  const amountCents = amountText ? parseDollars(amountText) : null;
  if (!barberId) return { error: "Pick a barber." };
  if (amountText && amountCents === null) return { error: "Enter an amount like 250 or 250.00." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { error: "Pick a due date." };

  const supabase = await createClient();
  // "shop:<id>" charges every barber showing at that shop in one go.
  let ids = [barberId];
  if (barberId.startsWith("shop:")) {
    const { data } = await supabase.from("barbers").select("id").eq("shop_id", barberId.slice(5)).eq("active", true);
    ids = (data ?? []).map((b) => b.id);
    if (ids.length === 0) return { error: "No barbers at that shop yet." };
  }
  // A blank amount means "their usual rent" from each barber's Edit.
  let rates = new Map<string, number>();
  if (amountCents === null) {
    const { data } = await supabase.from("rent_rates").select("barber_id, amount_cents").in("barber_id", ids);
    rates = new Map((data ?? []).map((r) => [r.barber_id, r.amount_cents]));
    if (rates.size === 0) return { error: "Enter an amount, or set their rent with Edit on the Shop page." };
  }
  const note = text(formData, "note") || null;
  const rows = ids
    .map((id) => ({ barber_id: id, amount_cents: amountCents ?? rates.get(id) ?? 0, due_date: dueDate, note }))
    .filter((r) => r.amount_cents > 0);
  const { error } = await supabase.from("rent_charges").insert(rows);
  if (error) return { error: error.message };
  done();
  const skipped = ids.length - rows.length;
  return {
    notice:
      (rows.length > 1 ? `Charged ${rows.length} barbers.` : "Rent charge added.") +
      (skipped ? ` Skipped ${skipped} with no rent set.` : ""),
  };
}

export async function setRentPaid(chargeId: string, paid: boolean) {
  await requireRole("owner");
  const supabase = await createClient();
  await supabase
    .from("rent_charges")
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq("id", chargeId);
  done();
}

export async function deleteRentCharge(chargeId: string) {
  await requireRole("owner");
  const supabase = await createClient();
  await supabase.from("rent_charges").delete().eq("id", chargeId);
  done();
}

// A barber marked it Low/Out; the order came in.
export async function markRestocked(supplyId: string) {
  const viewer = await requireRole("owner");
  const supabase = await createClient();
  await supabase
    .from("supplies")
    .update({ status: "full", updated_at: new Date().toISOString(), updated_by: viewer.userId })
    .eq("id", supplyId);
  revalidatePath("/owner");
  revalidatePath("/barber");
}

export async function addReview(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("owner");
  const shopId = text(formData, "shop_id");
  const author = text(formData, "author").slice(0, 60);
  const body = text(formData, "body").slice(0, 600);
  const rating = Number(text(formData, "rating"));
  const source = text(formData, "source").slice(0, 20) || null;
  if (!shopId) return { error: "Pick a shop." };
  if (!author) return { error: "Add the client's name (first name is fine)." };
  if (!body) return { error: "Paste in what they said." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Pick 1 to 5 stars." };
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").insert({ shop_id: shopId, author, body, rating, source });
  if (error) return { error: "Couldn't save. Try again." };
  done();
  return { notice: "Review added. It's on the website now." };
}

export async function setReviewVisible(reviewId: string, visible: boolean) {
  await requireRole("owner");
  const supabase = await createClient();
  await supabase.from("reviews").update({ visible }).eq("id", reviewId);
  done();
}

export async function deleteReview(reviewId: string) {
  await requireRole("owner");
  const supabase = await createClient();
  await supabase.from("reviews").delete().eq("id", reviewId);
  done();
}
