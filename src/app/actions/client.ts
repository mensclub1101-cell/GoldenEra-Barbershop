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
