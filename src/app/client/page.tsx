import type { Metadata } from "next";
import { ClientApp } from "@/components/client/ClientApp";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My account | Golden Era Barbershop" };

export default async function ClientPage() {
  const viewer = await requireRole("client");
  const supabase = await createClient();
  const [{ data: shops }, { data: barbers }] = await Promise.all([
    supabase.from("shops").select("*").order("sort"),
    supabase.from("barbers").select("*").eq("active", true).order("sort").order("display_name"),
  ]);
  return <ClientApp viewer={viewer} shops={shops ?? []} barbers={barbers ?? []} />;
}
