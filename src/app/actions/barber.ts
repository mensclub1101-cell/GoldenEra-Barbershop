"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { scheduleFromForm } from "@/lib/schedule";
import type { FormState } from "./auth";

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function updateMyCard(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireRole("barber", "owner");
  if (!viewer.seat) return { error: "Your account isn't linked to a barber seat yet." };

  const displayName = text(formData, "display_name");
  if (!displayName) return { error: "Your name can't be empty." };

  const rawUrl = text(formData, "booking_url");
  const bookingUrl = !rawUrl ? null : /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const instagram = text(formData, "instagram").replace(/^@/, "") || null;
  const { schedule, error: scheduleError } = scheduleFromForm(formData);
  if (scheduleError) return { error: scheduleError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("barbers")
    .update({
      display_name: displayName,
      specialty: text(formData, "specialty") || null,
      phone: text(formData, "phone") || null,
      booking_url: bookingUrl,
      instagram,
      schedule,
    })
    .eq("id", viewer.seat.id);
  if (error) return { error: error.message };

  revalidatePath("/barber");
  revalidatePath("/");
  return { notice: "Saved. Your card on the website is updated." };
}
