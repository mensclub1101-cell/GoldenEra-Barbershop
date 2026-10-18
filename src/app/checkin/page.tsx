import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/SiteHeader";
import { CheckInForm } from "@/components/CheckInForm";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = { title: "Check in | Golden Era Barbershop" };
export const dynamic = "force-dynamic";

// Walk-in check-in. Linked from the homepage and the QR code at each shop's
// door (/checkin?shop=pigeon-pass).
export default async function CheckInPage({ searchParams }: PageProps<"/checkin">) {
  const { shop } = await searchParams;
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const [{ data: shops }, { data: barbers }] = await Promise.all([
    supabase.from("shops").select("id, slug, name").order("sort"),
    supabase.from("barbers").select("id, shop_id, display_name").eq("active", true).order("sort"),
  ]);
  const list = (shops ?? []).map((s) => ({
    slug: s.slug,
    name: s.name,
    barbers: (barbers ?? []).filter((b) => b.shop_id === s.id).map((b) => ({ id: b.id, name: b.display_name })),
  }));

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-16">
        <div className="w-full max-w-md rounded-3xl border border-line p-6 sm:p-8">
          <h1 className="font-display text-4xl font-semibold uppercase tracking-wide">Walk-in check in</h1>
          <p className="mb-6 mt-2 text-sm text-muted">Get in line from your phone. We&rsquo;ll call you when it&rsquo;s your turn.</p>
          <CheckInForm shops={list} initialShop={typeof shop === "string" ? shop : undefined} />
        </div>
      </main>
    </>
  );
}
