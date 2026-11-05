"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { FormState } from "./auth";

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// Any signed-in account can edit its own name and phone; RLS limits the
// update to the caller's own row.
export async function updateMyDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole("client", "barber", "owner");
  const fullName = text(formData, "full_name");
  if (!fullName) return { error: "Your name can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: text(formData, "phone") || null })
    .eq("id", viewer.userId);
  if (error) return { error: error.message };
  revalidatePath("/client");
  return { notice: "Saved." };
}

// Save (or clear, with null) the client's go-to barber.
export async function setMyBarber(barberId: string | null) {
  const viewer = await requireRole("client");
  const supabase = await createClient();
  await supabase.from("profiles").update({ favorite_barber_id: barberId }).eq("id", viewer.userId);
  revalidatePath("/client");
}

// A review left in the app after a visit: 10 points, whatever the rating.
// The database checks there's a finished visit without a review yet.
export async function leaveReview(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole("client");
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim();
  if (!(rating >= 1 && rating <= 5)) return { error: "Pick 1 to 5 stars." };
  if (!body) return { error: "Write a few words about your cut." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_review", { p_rating: rating, p_body: body });
  if (error) return { error: error.message };
  revalidatePath("/client");
  return { notice: "Thanks! 10 points added." };
}
