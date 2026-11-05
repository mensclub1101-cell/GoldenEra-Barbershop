import type { Metadata } from "next";
import { ClientApp } from "@/components/client/ClientApp";
import type { Rewards } from "@/components/client/RewardsPanel";
import { requireRole } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My account | Golden Era Barbershop" };

export default async function ClientPage() {
  const viewer = await requireRole("client");
  const supabase = await createClient();
  const [{ data: shops }, { data: barbers }, { data: rewards }] = await Promise.all([
    supabase.from("shops").select("*").order("sort"),
    supabase.from("barbers").select("*").eq("active", true).order("sort").order("display_name"),
    supabase.rpc("my_rewards"),
  ]);
  return (
    <ClientApp
      viewer={viewer}
      shops={shops ?? []}
      barbers={barbers ?? []}
      rewards={(rewards as Rewards | null) ?? null}
      siteUrl={await getSiteUrl()}
    />
  );
}
