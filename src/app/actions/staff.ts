"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { todayInShop } from "@/lib/format";
import type { SupplyStatus } from "@/lib/database.types";

// Barber app actions. Each re-checks the role; RLS limits every query to the
// caller's own shop (and own client book) in the database.

async function staff() {
  const viewer = await requireRole("barber", "owner");
  if (!viewer.seat) throw new Error("This account isn't linked to a barber seat.");
  return { viewer, seat: viewer.seat, supabase: await createClient() };
}

export async function closeWalkin(walkinId: string, outcome: "done" | "no_show") {
  const { seat, supabase } = await staff();
  await supabase
    .from("walkins")
    .update({ status: outcome, handled_by: seat.id, handled_at: new Date().toISOString() })
    .eq("id", walkinId)
    .eq("status", "waiting");
}

// Save a walk-in to this barber's client book, or count another visit.
export async function saveWalkinAsClient(walkinId: string): Promise<{ error?: string; notice?: string }> {
  const { seat, supabase } = await staff();
  const { data: walkin } = await supabase.from("walkins").select("name, phone").eq("id", walkinId).maybeSingle();
  if (!walkin) return { error: "That walk-in is gone." };

  const { data: existing } = await supabase
    .from("clients")
    .select("id, visits")
    .eq("barber_id", seat.id)
    .eq("phone", walkin.phone)
    .maybeSingle();
  const now = new Date().toISOString();
  const { error } = existing
    ? await supabase.from("clients").update({ visits: existing.visits + 1, last_visit_at: now }).eq("id", existing.id)
    : await supabase.from("clients").insert({ barber_id: seat.id, name: walkin.name, phone: walkin.phone });
  if (error) return { error: error.message };
  revalidatePath("/barber");
  return { notice: existing ? `${walkin.name}: visit ${existing.visits + 1}` : `${walkin.name} saved to your clients` };
}

export async function updateClientNotes(clientId: string, notes: string) {
  const { supabase } = await staff();
  await supabase.from("clients").update({ notes: notes.trim().slice(0, 500) || null }).eq("id", clientId);
  revalidatePath("/barber");
}

// Add a client by hand (someone who booked online, a regular from before).
export async function addClient(name: string, phone: string, notes: string): Promise<{ error?: string }> {
  const { seat, supabase } = await staff();
  const cleanName = name.trim().slice(0, 60);
  if (!cleanName) return { error: "Add a name." };
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits && digits.length !== 10) return { error: "Phone needs 10 digits, or leave it blank." };
  const { error } = await supabase
    .from("clients")
    .insert({ barber_id: seat.id, name: cleanName, phone: digits || null, notes: notes.trim().slice(0, 500) || null });
  if (error?.code === "23505") return { error: "That number is already in your clients." };
  if (error) return { error: "Couldn't save. Try again." };
  revalidatePath("/barber");
  return {};
}

export async function deleteClient(clientId: string) {
  const { supabase } = await staff();
  await supabase.from("clients").delete().eq("id", clientId);
  revalidatePath("/barber");
}

export async function setSupplyStatus(supplyId: string, status: SupplyStatus) {
  const { viewer, supabase } = await staff();
  await supabase
    .from("supplies")
    .update({ status, updated_at: new Date().toISOString(), updated_by: viewer.userId })
    .eq("id", supplyId);
  revalidatePath("/barber");
}

export async function addSupply(name: string) {
  const { seat, supabase } = await staff();
  const clean = name.trim().slice(0, 40);
  if (!clean) return;
  await supabase.from("supplies").insert({ shop_id: seat.shop_id, name: clean, sort: 100 });
  revalidatePath("/barber");
}

export async function removeSupply(supplyId: string) {
  const { supabase } = await staff();
  await supabase.from("supplies").delete().eq("id", supplyId);
  revalidatePath("/barber");
}

export async function setCleaningDone(taskId: string, done: boolean) {
  const { viewer, supabase } = await staff();
  await supabase
    .from("cleaning_tasks")
    .update(done ? { last_done_on: todayInShop(), done_by: viewer.userId } : { last_done_on: null, done_by: null })
    .eq("id", taskId);
  revalidatePath("/barber");
}

export async function setCleaningAssignee(taskId: string, assignee: string) {
  const { supabase } = await staff();
  await supabase
    .from("cleaning_tasks")
    .update({ assignee: assignee.trim().slice(0, 40) || null })
    .eq("id", taskId);
  revalidatePath("/barber");
}

export async function addCleaningTask(task: string) {
  const { seat, supabase } = await staff();
  const clean = task.trim().slice(0, 80);
  if (!clean) return;
  await supabase.from("cleaning_tasks").insert({ shop_id: seat.shop_id, task: clean, sort: 100 });
  revalidatePath("/barber");
}

export async function removeCleaningTask(taskId: string) {
  const { supabase } = await staff();
  await supabase.from("cleaning_tasks").delete().eq("id", taskId);
  revalidatePath("/barber");
}
